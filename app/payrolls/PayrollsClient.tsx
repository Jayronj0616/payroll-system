"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Swal from "sweetalert2";
import { Employee, GROUP_MF } from "@/lib/employee";
import { savePayrolls, PayrollEntry } from "./actions";

type GroupData = {
  records: Array<{
    id: number;
    employee_id: number;
    payroll_date: string;
    days_worked: number;
    overtime_hours: number;
    overtime_pay: number;
    total_salary: number;
  }>;
  count: number;
  overtime_pay: number;
  total_salary: number;
};

type Props = {
  employees: Employee[];
  employeeGroups: string[];
  payrollsByGroup: Record<string, GroupData>;
  selectedPayrollDate: string | null;
  entryPayrollDate: string;
  historySummary: {
    record_count: number;
    overtime_pay: number;
    total_salary: number;
    group_totals: Record<string, number>;
  };
  initialTab: "compute" | "history";
};

type RowState = {
  id: number;
  employee_id: number;
  name: string;
  voiceCode: string | null;
  group: string;
  rate: number;
  days: string;
  ot: string;
};

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value || 0);
}

function formatDateLabel(dateStr: string | null): string | null {
  if (!dateStr) return null;
  return new Date(dateStr + "T00:00:00").toLocaleDateString("en-US", {
    month: "long",
    day: "2-digit",
    year: "numeric",
  });
}

// ---------- Voice command parsing (ported 1:1 from payrolls/index.blade.php) ----------

function normalizeVoiceCommand(command: string): string {
  let normalizedCommand = (command || "")
    .toLowerCase()
    .replace(/[’`]/g, "'")
    .replace(/\bover\s+time\b/g, "overtime")
    .replace(/\bot\b/g, "overtime")
    .replace(/[,.!?]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const numberPhraseReplacements: [string, string][] = [
    ["zero and a half", "0.5"],
    ["one and a half", "1.5"],
    ["two and a half", "2.5"],
    ["three and a half", "3.5"],
    ["four and a half", "4.5"],
    ["five and a half", "5.5"],
    ["six and a half", "6.5"],
    ["seven and a half", "7.5"],
    ["eight and a half", "8.5"],
    ["nine and a half", "9.5"],
    ["ten and a half", "10.5"],
    ["half", "0.5"],
  ];

  numberPhraseReplacements.forEach(([phrase, value]) => {
    normalizedCommand = normalizedCommand.replace(new RegExp(`\\b${phrase}\\b`, "g"), value);
  });

  const numberWords: Record<string, string> = {
    zero: "0",
    one: "1",
    two: "2",
    three: "3",
    four: "4",
    five: "5",
    six: "6",
    seven: "7",
    eight: "8",
    nine: "9",
    ten: "10",
    eleven: "11",
    twelve: "12",
    thirteen: "13",
    fourteen: "14",
    fifteen: "15",
    sixteen: "16",
    seventeen: "17",
    eighteen: "18",
    nineteen: "19",
    twenty: "20",
  };

  Object.entries(numberWords).forEach(([word, value]) => {
    normalizedCommand = normalizedCommand.replace(new RegExp(`\\b${word}\\b`, "g"), value);
  });

  return normalizedCommand.replace(/\s+/g, " ").trim();
}

function employeeVoicePattern(value: string): RegExp {
  const normalizedValue = normalizeVoiceCommand(value);
  if (!normalizedValue) return /$^/;

  const tokens = normalizedValue.split(" ");
  const lastIndex = tokens.length - 1;
  const pattern = tokens
    .map((token, index) => {
      const escapedToken = token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      if (index !== lastIndex) return escapedToken;
      return token.endsWith("s") ? `${escapedToken}(?:'s)?` : `${escapedToken}(?:'s|s)?`;
    })
    .join("\\s+");

  return new RegExp(`\\b${pattern}\\b`, "i");
}

function extractFirstNumber(command: string, patterns: RegExp[]): number | null {
  for (const pattern of patterns) {
    const match = command.match(pattern);
    if (match?.[1] !== undefined) {
      return parseFloat(match[1]);
    }
  }
  return null;
}

type EmployeeMatch = { employee: RowState; matchLabel: string };

function findBestEmployeeMatch(
  command: string,
  rows: RowState[],
  valueResolver: (row: RowState) => string | null,
  label: string
): EmployeeMatch | null {
  const matches = rows
    .map((row) => {
      const value = valueResolver(row);
      if (!value) return null;
      const match = command.match(employeeVoicePattern(value));
      if (!match) return null;
      return { employee: row, match, label, value };
    })
    .filter((m): m is NonNullable<typeof m> => m !== null)
    .sort((left, right) => right.match[0].length - left.match[0].length);

  if (matches.length === 0) return null;
  if (matches.length > 1 && matches[0].match[0].length === matches[1].match[0].length) return null;

  return {
    employee: matches[0].employee,
    matchLabel: `${matches[0].label} "${matches[0].value}"`,
  };
}

function findEmployeeInCommand(command: string, rows: RowState[]): EmployeeMatch | null {
  const voiceCodeMatch = findBestEmployeeMatch(command, rows, (r) => r.voiceCode, "voice code");
  if (voiceCodeMatch) return voiceCodeMatch;
  return findBestEmployeeMatch(command, rows, (r) => r.name, "employee name");
}

function extractCompactNumberPair(
  command: string,
  employeeMatch: EmployeeMatch | null
): { daysWorked: number; overtimeHours: number } | null {
  const matchedPhrase = employeeMatch?.matchLabel
    ? employeeMatch.matchLabel.match(/"([^"]+)"/)?.[1]?.toLowerCase() ?? ""
    : "";

  const commandWithoutEmployee = matchedPhrase
    ? command.replace(employeeVoicePattern(matchedPhrase), " ")
    : command;

  if (/\b(day|days|hour|hours|overtime)\b/.test(commandWithoutEmployee)) {
    return null;
  }

  const numbers = commandWithoutEmployee.match(/\d+(?:\.\d+)?/g) || [];
  if (numbers.length < 2) return null;

  return {
    daysWorked: parseFloat(numbers[0]),
    overtimeHours: parseFloat(numbers[1]),
  };
}

type ParsedCommand =
  | { success: true; employee: RowState; matchLabel: string; daysWorked: number | null; overtimeHours: number | null }
  | { success: false; message: string };

function parseVoiceCommand(command: string, rows: RowState[]): ParsedCommand {
  const normalizedCommand = normalizeVoiceCommand(command);

  if (!normalizedCommand) {
    return { success: false, message: "The command was empty. Please try again." };
  }

  const employeeMatch = findEmployeeInCommand(normalizedCommand, rows);
  if (!employeeMatch) {
    return {
      success: false,
      message: "I could not match that employee voice code or name. Please say it clearly.",
    };
  }

  const daysWorked = extractFirstNumber(normalizedCommand, [
    /(\d+(?:\.\d+)?)\s*(?:day|days)\b/,
    /(?:day|days)\s*(\d+(?:\.\d+)?)\b/,
  ]);

  const overtimeHours = extractFirstNumber(normalizedCommand, [
    /(\d+(?:\.\d+)?)\s*(?:hour|hours)\s*overtime\b/,
    /(\d+(?:\.\d+)?)\s*overtime\b/,
    /overtime\s*(\d+(?:\.\d+)?)(?:\s*(?:hour|hours))?\b/,
  ]);

  const compactPair = extractCompactNumberPair(normalizedCommand, employeeMatch);
  const resolvedDays = daysWorked ?? compactPair?.daysWorked ?? null;
  const resolvedOt = overtimeHours ?? compactPair?.overtimeHours ?? null;

  if (resolvedDays === null && resolvedOt === null) {
    return { success: false, message: "I heard the employee name, but not the days or overtime values." };
  }

  return {
    success: true,
    employee: employeeMatch.employee,
    matchLabel: employeeMatch.matchLabel,
    daysWorked: resolvedDays,
    overtimeHours: resolvedOt,
  };
}

function formatVoiceNumber(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function voiceErrorMessage(errorCode: string): string {
  const messages: Record<string, string> = {
    "audio-capture": "No microphone was detected. Please check your microphone and try again.",
    network: "The browser could not reach the speech service. Please try again.",
    "not-allowed": "Microphone permission was blocked. Please allow microphone access and try again.",
    "service-not-allowed": "Microphone access is not allowed in this browser session.",
    "no-speech": "No speech was detected. Please try the command again.",
    aborted: "Listening was stopped before the command finished.",
  };
  return messages[errorCode] || "Voice recognition ran into an unexpected problem. Please try again.";
}

function toast(icon: "success" | "error", title: string) {
  Swal.fire({
    toast: true,
    position: "top-end",
    icon,
    title,
    showConfirmButton: false,
    timer: 3500,
    timerProgressBar: true,
  });
}

// ---------- Component ----------

export default function PayrollsClient({
  employees,
  employeeGroups,
  payrollsByGroup,
  selectedPayrollDate,
  entryPayrollDate,
  historySummary,
  initialTab,
}: Props) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"compute" | "history">(initialTab);
  const [payrollDate, setPayrollDate] = useState(entryPayrollDate);
  const [historyDateInput, setHistoryDateInput] = useState(selectedPayrollDate ?? "");
  const [isSaving, setIsSaving] = useState(false);

  const [rows, setRows] = useState<RowState[]>(() =>
    employees.map((e) => ({
      id: e.id,
      employee_id: e.id,
      name: e.name,
      voiceCode: e.voice_code,
      group: e.payroll_group,
      rate: Number(e.daily_rate),
      days: "",
      ot: "",
    }))
  );

  const [voiceSupported, setVoiceSupported] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [lastTranscript, setLastTranscript] = useState("");
  const [voiceStatus, setVoiceStatus] = useState(
    "Tap the floating Start Listening button, say a command, then review the updated row before saving."
  );
  const [highlightedEmployeeId, setHighlightedEmployeeId] = useState<number | null>(null);

  const recognitionRef = useRef<any>(null);
  const voiceProcessTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const highlightResetTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rowsRef = useRef(rows);
  rowsRef.current = rows;

  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setVoiceSupported(false);
      setVoiceStatus("Voice recognition is not available in this browser. Please use Chrome or Edge.");
      return;
    }

    setVoiceSupported(true);
    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
      setVoiceStatus("Listening for a payroll command...");
    };

    recognition.onend = () => {
      setIsListening(false);
      if (voiceProcessTimeoutRef.current) return;
      setLastTranscript((current) => {
        if (!current) {
          setVoiceStatus("Listening stopped. No command was captured.");
        }
        return current;
      });
    };

    recognition.onerror = (event: any) => {
      setIsListening(false);
      const message = voiceErrorMessage(event.error);
      setVoiceStatus(message);
      toast("error", message);
    };

    recognition.onresult = (event: any) => {
      const transcript = Array.from(event.results as any[])
        .map((result: any) => result[0]?.transcript || "")
        .join(" ")
        .trim();

      setLastTranscript(transcript);
      setVoiceStatus(`Hearing: "${transcript}" — keep speaking or pause to process...`);

      if (voiceProcessTimeoutRef.current) {
        clearTimeout(voiceProcessTimeoutRef.current);
      }

      voiceProcessTimeoutRef.current = setTimeout(() => {
        voiceProcessTimeoutRef.current = null;
        recognition.stop();
        processVoiceTranscript(transcript);
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, 2000);
    };

    recognitionRef.current = recognition;

    return () => {
      recognition.onstart = null;
      recognition.onend = null;
      recognition.onerror = null;
      recognition.onresult = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function processVoiceTranscript(transcript: string) {
    if (!transcript) return;

    const parsed = parseVoiceCommand(transcript, rowsRef.current);

    if (!parsed.success) {
      setVoiceStatus(parsed.message);
      toast("error", parsed.message);
      return;
    }

    applyParsedVoiceCommand(parsed);
  }

  function applyParsedVoiceCommand(parsed: Extract<ParsedCommand, { success: true }>) {
    setRows((prev) =>
      prev.map((row) => {
        if (row.id !== parsed.employee.id) return row;
        return {
          ...row,
          days: parsed.daysWorked !== null ? String(parsed.daysWorked) : row.days,
          ot: parsed.overtimeHours !== null ? String(parsed.overtimeHours) : row.ot,
        };
      })
    );

    highlightEmployeeRow(parsed.employee.id);

    const updates: string[] = [];
    if (parsed.daysWorked !== null) {
      updates.push(`${formatVoiceNumber(parsed.daysWorked)} day${parsed.daysWorked === 1 ? "" : "s"}`);
    }
    if (parsed.overtimeHours !== null) {
      updates.push(
        `${formatVoiceNumber(parsed.overtimeHours)} hour${parsed.overtimeHours === 1 ? "" : "s"} overtime`
      );
    }

    const voiceTarget = parsed.matchLabel ? ` using ${parsed.matchLabel}` : "";
    const message = `Updated ${parsed.employee.name}${voiceTarget} with ${updates.join(" and ")}.`;
    setVoiceStatus(message);
    toast("success", message);
  }

  function highlightEmployeeRow(employeeId: number) {
    setHighlightedEmployeeId(employeeId);
    if (highlightResetTimeoutRef.current) clearTimeout(highlightResetTimeoutRef.current);
    highlightResetTimeoutRef.current = setTimeout(() => setHighlightedEmployeeId(null), 5000);

    setTimeout(() => {
      document
        .getElementById(`employee-row-${employeeId}`)
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 100);
  }

  function toggleVoiceRecognition() {
    if (!voiceSupported || !recognitionRef.current) {
      toast("error", "Voice recognition is not supported in this browser.");
      return;
    }

    if (isListening) {
      if (voiceProcessTimeoutRef.current) {
        clearTimeout(voiceProcessTimeoutRef.current);
        voiceProcessTimeoutRef.current = null;
        processVoiceTranscript(lastTranscript);
      }
      recognitionRef.current.stop();
      return;
    }

    setLastTranscript("");
    try {
      recognitionRef.current.start();
    } catch (err) {
      setVoiceStatus("The microphone could not start. Please try again.");
      toast("error", "The microphone could not start. Please try again.");
    }
  }

  function getEmployeesByGroup(group: string) {
    return rows.filter((r) => r.group === group);
  }

  function rowOtPay(row: RowState): number {
    const ot = parseFloat(row.ot) || 0;
    return (row.rate / 8) * ot;
  }

  function rowTotal(row: RowState): number {
    const days = parseFloat(row.days) || 0;
    return row.rate * days + rowOtPay(row);
  }

  function groupOvertime(group: string): number {
    return getEmployeesByGroup(group).reduce((sum, r) => sum + rowOtPay(r), 0);
  }

  function groupTotal(group: string): number {
    return getEmployeesByGroup(group).reduce((sum, r) => sum + rowTotal(r), 0);
  }

  const grandTotal = useMemo(() => rows.reduce((sum, r) => sum + rowTotal(r), 0), [rows]);

  function updateRow(id: number, field: "days" | "ot", value: string) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, [field]: value } : r)));
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsSaving(true);

    const entries: PayrollEntry[] = rows.map((r) => ({
      employee_id: r.employee_id,
      days_worked: parseFloat(r.days) || 0,
      overtime_hours: parseFloat(r.ot) || 0,
    }));

    try {
      await savePayrolls(payrollDate, entries);
    } catch (err: any) {
      // Next.js implements redirect() in Server Actions by throwing an
      // error whose `digest` starts with "NEXT_REDIRECT" — that error must
      // be rethrown so the framework can actually perform the navigation.
      // Anything else here is a genuine failure.
      if (typeof err?.digest === "string" && err.digest.startsWith("NEXT_REDIRECT")) {
        throw err;
      }
      toast("error", err instanceof Error ? err.message : "Failed to save payroll.");
      setIsSaving(false);
    }
  }

  function handleHistoryDateSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    router.push(`/payrolls?tab=history&payroll_date=${historyDateInput}`);
  }

  const selectedDateLabel = formatDateLabel(selectedPayrollDate);

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Payroll Management</h1>
          <p className="text-sm text-slate-500 mt-1">
            Compute salaries by payroll date and keep BASE 3 and MF separated for reporting.
          </p>
        </div>

        <div className="flex p-1 space-x-1 bg-slate-100/80 rounded-xl border border-slate-200">
          <button
            onClick={() => setActiveTab("compute")}
            className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all flex items-center gap-2 outline-none ${
              activeTab === "compute"
                ? "bg-white shadow text-indigo-700"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"
              />
            </svg>
            Compute Entry
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all flex items-center gap-2 outline-none ${
              activeTab === "history"
                ? "bg-white shadow text-indigo-700"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            Past Records
          </button>
        </div>
      </div>

      {activeTab === "compute" && (
        <div>
          <form id="bulkPayrollForm" onSubmit={handleSubmit} className="pb-28 sm:pb-0">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
                <label htmlFor="payroll_date" className="block text-sm font-semibold text-slate-700 mb-2">
                  Payroll Date
                </label>
                <input
                  type="date"
                  name="payroll_date"
                  id="payroll_date"
                  value={payrollDate}
                  onChange={(e) => setPayrollDate(e.target.value)}
                  required
                  className="w-full rounded-lg border-slate-300 py-2.5 px-3 focus:ring-indigo-200 focus:border-indigo-500 text-sm"
                />
                <p className="text-xs text-slate-500 mt-2">
                  This date is used for history filtering and grouped salary reports.
                </p>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-sky-200 p-5">
                <div className="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold bg-sky-100 text-sky-700">
                  BASE 3
                </div>
                <p className="text-sm font-medium text-slate-500 mt-3">Live Salary Total</p>
                <p className="text-2xl font-bold text-sky-700 mt-1">{formatCurrency(groupTotal("BASE 3"))}</p>
                <p className="text-xs text-slate-500 mt-2">{getEmployeesByGroup("BASE 3").length} employee(s)</p>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-amber-200 p-5">
                <div className="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold bg-amber-100 text-amber-700">
                  MF
                </div>
                <p className="text-sm font-medium text-slate-500 mt-3">Live Salary Total</p>
                <p className="text-2xl font-bold text-amber-700 mt-1">{formatCurrency(groupTotal("MF"))}</p>
                <p className="text-xs text-slate-500 mt-2">{getEmployeesByGroup("MF").length} employee(s)</p>
              </div>

              <div className="bg-indigo-50 rounded-xl shadow-sm border border-indigo-200 p-5">
                <p className="text-sm font-medium text-indigo-700">Overall Payroll Total</p>
                <p className="text-2xl font-bold text-indigo-800 mt-3">{formatCurrency(grandTotal)}</p>
                <p className="text-xs text-indigo-600 mt-2">Combined total for all employees on the selected date.</p>
              </div>
            </div>

            <div className="relative overflow-hidden rounded-2xl border border-rose-100 bg-gradient-to-br from-white via-white to-rose-50/70 shadow-sm mb-6">
              <div className="pointer-events-none absolute inset-y-0 right-0 hidden xl:block w-72 bg-gradient-to-l from-rose-100/60 to-transparent" />

              <div className="relative grid grid-cols-1 xl:grid-cols-[minmax(0,1.3fr)_minmax(320px,0.9fr)] gap-4 p-5 sm:p-6">
                <div className="pr-0 xl:pr-6">
                  <div className="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold bg-rose-100 text-rose-700">
                    Voice Commands
                  </div>
                  <h2 className="text-xl font-semibold text-slate-900 mt-3 tracking-tight">
                    Speak payroll updates without losing your place
                  </h2>
                  <p className="text-sm text-slate-600 mt-2 max-w-2xl">
                    Use a worker voice code like <span className="font-semibold text-slate-800">MANGO</span> or{" "}
                    <span className="font-semibold text-slate-800">TIGER</span>. The listen button stays pinned in
                    the corner while you scroll through the payroll rows.
                  </p>

                  <div className="flex flex-wrap gap-2 mt-4">
                    <span className="inline-flex items-center rounded-full border border-slate-200 bg-white/90 px-3 py-2 text-sm font-medium text-slate-700 shadow-sm">
                      &quot;Put 3 days in mango and 3 hours overtime&quot;
                    </span>
                    <span className="inline-flex items-center rounded-full border border-slate-200 bg-white/90 px-3 py-2 text-sm font-medium text-slate-700 shadow-sm">
                      &quot;Tiger 5 days 1 hour overtime&quot;
                    </span>
                    <span className="inline-flex items-center rounded-full border border-slate-200 bg-white/90 px-3 py-2 text-sm font-medium text-slate-700 shadow-sm">
                      &quot;Falcon 3 days 4 OT&quot;
                    </span>
                    <span className="inline-flex items-center rounded-full border border-slate-200 bg-white/90 px-3 py-2 text-sm font-medium text-slate-700 shadow-sm">
                      &quot;Falcon 3 4&quot;
                    </span>
                  </div>

                  <div className="text-xs text-slate-500 leading-5 mt-4">
                    {voiceSupported ? (
                      <p>Use Chrome or Edge and allow microphone access when the browser asks.</p>
                    ) : (
                      <p>This browser does not support the voice feature yet.</p>
                    )}
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white/85 backdrop-blur px-4 py-4 sm:px-5 sm:py-5 shadow-sm">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Voice Status</p>
                      <p
                        className={`text-sm font-semibold mt-2 ${isListening ? "text-rose-700" : "text-slate-700"}`}
                      >
                        {isListening ? "Listening now" : "Ready when you are"}
                      </p>
                    </div>

                    <span
                      className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold shrink-0 ${
                        isListening ? "bg-rose-100 text-rose-700" : "bg-emerald-100 text-emerald-700"
                      }`}
                    >
                      <span className="relative flex h-2.5 w-2.5">
                        {isListening && (
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                        )}
                        <span
                          className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                            isListening ? "bg-rose-500" : "bg-emerald-500"
                          }`}
                        />
                      </span>
                      <span>{isListening ? "Live" : "Standby"}</span>
                    </span>
                  </div>

                  <p className="text-sm text-slate-800 mt-4 min-h-[2.75rem]">{voiceStatus}</p>

                  <div className="mt-4 pt-4 border-t border-slate-200">
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Last Transcript</p>
                    <p className="text-sm font-medium text-slate-700 mt-2 break-words min-h-[1.25rem]">
                      {lastTranscript || "No command heard yet."}
                    </p>
                  </div>

                  <p className="text-xs text-slate-500 mt-4">
                    Use the floating listen button any time, then review the row and click Save Payroll.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex justify-end mb-4">
              <button
                type="submit"
                disabled={isSaving}
                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-all flex items-center gap-2 disabled:opacity-60"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"
                  />
                </svg>
                {isSaving ? "Saving..." : "Save Payroll"}
              </button>
            </div>

            <div className="space-y-6">
              {employeeGroups.map((group) => {
                const groupRows = getEmployeesByGroup(group);
                const isMf = group === GROUP_MF;
                return (
                  <section
                    key={group}
                    className={`bg-white rounded-xl shadow-sm border overflow-hidden ${
                      isMf ? "border-amber-200" : "border-sky-200"
                    }`}
                  >
                    <div
                      className={`px-6 py-5 border-b ${
                        isMf
                          ? "bg-gradient-to-r from-amber-50 to-white border-amber-100"
                          : "bg-gradient-to-r from-sky-50 to-white border-sky-100"
                      }`}
                    >
                      <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
                        <div>
                          <span
                            className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
                              isMf ? "bg-amber-100 text-amber-700" : "bg-sky-100 text-sky-700"
                            }`}
                          >
                            {group}
                          </span>
                          <h3 className="text-lg font-semibold text-slate-900 mt-3">{group} Payroll Entry</h3>
                          <p className="text-sm text-slate-500">{groupRows.length} employee(s) in this group</p>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 xl:min-w-[360px]">
                          <div className="rounded-xl border border-white bg-white/80 px-4 py-3">
                            <p className="text-xs uppercase tracking-wide text-slate-500">OT Total</p>
                            <p className="text-lg font-semibold text-emerald-600 mt-1">
                              {formatCurrency(groupOvertime(group))}
                            </p>
                          </div>
                          <div className="rounded-xl border border-white bg-white/80 px-4 py-3">
                            <p className="text-xs uppercase tracking-wide text-slate-500">Salary Total</p>
                            <p
                              className={`text-lg font-semibold mt-1 ${isMf ? "text-amber-700" : "text-sky-700"}`}
                            >
                              {formatCurrency(groupTotal(group))}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse whitespace-nowrap">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase text-xs tracking-wider">
                            <th className="px-6 py-4 font-semibold">Name</th>
                            <th className="px-6 py-4 font-semibold text-right">Daily Rate</th>
                            <th className="px-6 py-4 font-semibold text-center">Days Worked</th>
                            <th className="px-6 py-4 font-semibold text-center">Overtime Hours</th>
                            <th className="px-6 py-4 font-semibold text-right text-emerald-600">Overtime Pay</th>
                            <th className="px-6 py-4 font-semibold text-right text-indigo-600">Total Salary</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {groupRows.length === 0 ? (
                            <tr>
                              <td colSpan={6} className="px-6 py-10 text-center text-slate-500 bg-slate-50/40">
                                No employees assigned to this group yet.
                              </td>
                            </tr>
                          ) : (
                            groupRows.map((row) => (
                              <tr
                                key={row.id}
                                id={`employee-row-${row.id}`}
                                className={`transition-colors focus-within:bg-indigo-50/20 ${
                                  highlightedEmployeeId === row.id
                                    ? "bg-emerald-50 hover:bg-emerald-50"
                                    : "hover:bg-slate-50"
                                }`}
                              >
                                <td className="px-6 py-3">
                                  <div className="font-bold text-slate-800 rounded-md px-3 py-2 flex items-center justify-between gap-3 min-h-10 shadow-sm border border-slate-200 bg-slate-100/60">
                                    <div className="flex flex-col gap-1">
                                      <span>{row.name}</span>
                                      {row.voiceCode && (
                                        <span className="text-[11px] font-semibold tracking-wide text-rose-700">
                                          Voice code: {row.voiceCode}
                                        </span>
                                      )}
                                    </div>
                                    {highlightedEmployeeId === row.id && (
                                      <span className="inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold bg-emerald-100 text-emerald-700">
                                        Voice Updated
                                      </span>
                                    )}
                                  </div>
                                </td>
                                <td className="px-6 py-3">
                                  <div className="font-mono font-medium text-slate-700 rounded-md px-3 py-2 text-right flex items-center justify-end h-10 shadow-sm border border-slate-200 bg-slate-100/60">
                                    {formatCurrency(row.rate)}
                                  </div>
                                </td>
                                <td className="px-6 py-3">
                                  <input
                                    type="number"
                                    step="0.5"
                                    min="0"
                                    value={row.days}
                                    onChange={(e) => updateRow(row.id, "days", e.target.value)}
                                    className="w-full rounded-md border-slate-300 border focus:border-indigo-500 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 px-3 py-2 text-center font-mono shadow-sm transition-shadow h-10 placeholder:text-slate-300"
                                    placeholder="0"
                                  />
                                </td>
                                <td className="px-6 py-3">
                                  <input
                                    type="number"
                                    step="0.5"
                                    min="0"
                                    value={row.ot}
                                    onChange={(e) => updateRow(row.id, "ot", e.target.value)}
                                    className="w-full rounded-md border-slate-300 border focus:border-indigo-500 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 px-3 py-2 text-center font-mono shadow-sm transition-shadow h-10 placeholder:text-slate-300"
                                    placeholder="0"
                                  />
                                </td>
                                <td className="px-6 py-3 text-right">
                                  <span className="font-mono font-medium text-emerald-600">
                                    {formatCurrency(rowOtPay(row))}
                                  </span>
                                </td>
                                <td className="px-6 py-3 text-right">
                                  <span
                                    className={`font-mono font-bold ${isMf ? "text-amber-700" : "text-sky-700"}`}
                                  >
                                    {formatCurrency(rowTotal(row))}
                                  </span>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                        <tfoot
                          className={`border-t-2 ${isMf ? "bg-amber-50 border-amber-100" : "bg-sky-50 border-sky-100"}`}
                        >
                          <tr>
                            <td
                              colSpan={5}
                              className={`px-6 py-5 text-right font-bold tracking-wide uppercase text-sm ${
                                isMf ? "text-amber-900" : "text-sky-900"
                              }`}
                            >
                              {group} Total Salary
                            </td>
                            <td className="px-6 py-5 text-right">
                              <span
                                className={`font-mono font-bold text-2xl ${isMf ? "text-amber-700" : "text-sky-700"}`}
                              >
                                {formatCurrency(groupTotal(group))}
                              </span>
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </section>
                );
              })}
            </div>

            <div className="fixed right-4 bottom-24 sm:right-6 sm:bottom-6 z-50">
              <button
                type="button"
                onClick={toggleVoiceRecognition}
                disabled={!voiceSupported}
                className={`group inline-flex items-center gap-3 rounded-2xl border px-4 py-3 sm:px-5 sm:py-3.5 shadow-[0_20px_45px_-20px_rgba(15,23,42,0.55)] transition-all disabled:cursor-not-allowed disabled:opacity-60 ${
                  isListening
                    ? "border-rose-500 bg-rose-600 text-white hover:bg-rose-700"
                    : voiceSupported
                    ? "border-slate-900 bg-slate-900 text-white hover:bg-slate-800"
                    : "border-slate-200 bg-white text-slate-500"
                }`}
                aria-pressed={isListening}
                aria-label="Toggle payroll voice recognition"
              >
                <span className="relative flex h-3 w-3 shrink-0">
                  {isListening && (
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
                  )}
                  <span
                    className={`relative inline-flex rounded-full h-3 w-3 ${
                      isListening ? "bg-white" : voiceSupported ? "bg-rose-300" : "bg-slate-300"
                    }`}
                  />
                </span>

                <span className="text-left leading-tight">
                  <span
                    className={`block text-[11px] uppercase tracking-[0.2em] ${
                      isListening ? "text-rose-100" : voiceSupported ? "text-slate-300" : "text-slate-400"
                    }`}
                  >
                    {isListening ? "Voice Live" : voiceSupported ? "Voice Ready" : "Voice Off"}
                  </span>
                  <span className="block text-sm sm:text-base font-semibold mt-1">
                    {isListening ? "Stop Listening" : "Start Listening"}
                  </span>
                </span>
              </button>
            </div>

            <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-slate-200 shadow-[0_-4px_6px_-1px_rgb(0,0,0,0.05)] sm:hidden z-40">
              <button
                type="submit"
                disabled={isSaving}
                className="w-full px-5 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-sm focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-all flex items-center justify-center gap-2 disabled:opacity-60"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"
                  />
                </svg>
                {isSaving ? "Saving..." : "Save Payroll"}
              </button>
            </div>
          </form>
        </div>
      )}

      {activeTab === "history" && (
        <div>
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-6 gap-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-800">History & Reports</h2>
              <p className="text-sm text-slate-500 mt-1">
                {selectedDateLabel
                  ? `Showing payroll records for ${selectedDateLabel}.`
                  : "No payroll records have been saved yet."}
              </p>
            </div>

            <form
              onSubmit={handleHistoryDateSubmit}
              className="flex flex-col sm:flex-row items-start sm:items-center gap-2"
            >
              <input
                type="date"
                value={historyDateInput}
                onChange={(e) => setHistoryDateInput(e.target.value)}
                className="rounded-lg border-slate-300 py-2.5 px-3 focus:ring-indigo-200 focus:border-indigo-500 text-sm"
              />
              <button
                type="submit"
                className="bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 py-2.5 px-3 rounded-lg text-sm font-medium shadow-sm transition-colors"
              >
                Show Date
              </button>
              <button
                type="button"
                onClick={() => router.push("/payrolls?tab=history")}
                className="text-slate-500 hover:text-indigo-600 font-medium text-sm transition-colors"
              >
                Latest Saved Date
              </button>
            </form>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex items-center">
              <div className="w-12 h-12 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center mr-4">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 7V3m8 4V3m-9 8h10m-11 9h12a2 2 0 002-2V7a2 2 0 00-2-2H6a2 2 0 00-2 2v11a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500 mb-1">Selected Payroll Date</p>
                <p className="text-xl font-bold text-slate-800">{selectedDateLabel ?? "No records yet"}</p>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-sky-200 p-6 flex items-center">
              <div className="w-12 h-12 rounded-full bg-sky-50 text-sky-600 flex items-center justify-center mr-4">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20h10M9 7a3 3 0 116 0 3 3 0 01-6 0z"
                  />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500 mb-1">BASE 3 Total</p>
                <p className="text-2xl font-bold text-sky-700">
                  {(historySummary.group_totals["BASE 3"] ?? 0).toFixed(2)}
                </p>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-amber-200 p-6 flex items-center">
              <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mr-4">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20h10M9 7a3 3 0 116 0 3 3 0 01-6 0z"
                  />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500 mb-1">MF Total</p>
                <p className="text-2xl font-bold text-amber-700">
                  {(historySummary.group_totals["MF"] ?? 0).toFixed(2)}
                </p>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-indigo-200 p-6 flex items-center">
              <div className="w-12 h-12 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center mr-4">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500 mb-1">Overall Total Salary</p>
                <p className="text-2xl font-bold text-indigo-700">{historySummary.total_salary.toFixed(2)}</p>
                <p className="text-xs text-slate-500 mt-1">{historySummary.record_count} saved record(s)</p>
              </div>
            </div>
          </div>

          {historySummary.record_count === 0 ? (
            <div className="bg-white shadow-sm border border-slate-200 rounded-xl px-6 py-12 text-center text-slate-500">
              <div className="flex flex-col items-center">
                <svg className="w-12 h-12 text-slate-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                <p className="text-lg">No payroll records found for this date.</p>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {employeeGroups.map((group) => {
                const groupData = payrollsByGroup[group];
                const isMf = group === GROUP_MF;
                const employeeById = new Map(employees.map((e) => [e.id, e]));

                return (
                  <section
                    key={group}
                    className={`bg-white shadow-sm border rounded-xl overflow-hidden ${
                      isMf ? "border-amber-200" : "border-sky-200"
                    }`}
                  >
                    <div
                      className={`px-6 py-5 border-b ${
                        isMf
                          ? "bg-gradient-to-r from-amber-50 to-white border-amber-100"
                          : "bg-gradient-to-r from-sky-50 to-white border-sky-100"
                      }`}
                    >
                      <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
                        <div>
                          <span
                            className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
                              isMf ? "bg-amber-100 text-amber-700" : "bg-sky-100 text-sky-700"
                            }`}
                          >
                            {group}
                          </span>
                          <h3 className="text-lg font-semibold text-slate-900 mt-3">{group} Saved Payroll</h3>
                          <p className="text-sm text-slate-500">
                            {groupData.count} record(s) on {selectedDateLabel}
                          </p>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 xl:min-w-[520px]">
                          <div className="rounded-xl border border-white bg-white/80 px-4 py-3">
                            <p className="text-xs uppercase tracking-wide text-slate-500">Records</p>
                            <p className="text-lg font-semibold text-slate-800 mt-1">{groupData.count}</p>
                          </div>
                          <div className="rounded-xl border border-white bg-white/80 px-4 py-3">
                            <p className="text-xs uppercase tracking-wide text-slate-500">OT Total</p>
                            <p className="text-lg font-semibold text-emerald-600 mt-1">
                              {groupData.overtime_pay.toFixed(2)}
                            </p>
                          </div>
                          <div className="rounded-xl border border-white bg-white/80 px-4 py-3">
                            <p className="text-xs uppercase tracking-wide text-slate-500">Salary Total</p>
                            <p className={`text-lg font-semibold mt-1 ${isMf ? "text-amber-700" : "text-sky-700"}`}>
                              {groupData.total_salary.toFixed(2)}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse whitespace-nowrap">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase text-xs tracking-wider">
                            <th className="px-6 py-4 font-semibold">Date</th>
                            <th className="px-6 py-4 font-semibold">Name</th>
                            <th className="px-6 py-4 font-semibold text-right">Daily Rate</th>
                            <th className="px-6 py-4 font-semibold text-right">Days Worked</th>
                            <th className="px-6 py-4 font-semibold text-right">OT Hours</th>
                            <th className="px-6 py-4 font-semibold text-right text-emerald-600">OT Pay</th>
                            <th className="px-6 py-4 font-semibold text-right text-indigo-600">Total Salary</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {groupData.records.length === 0 ? (
                            <tr>
                              <td colSpan={7} className="px-6 py-10 text-center text-slate-500 bg-slate-50/40">
                                No records saved for {group} on this payroll date.
                              </td>
                            </tr>
                          ) : (
                            groupData.records.map((payroll) => {
                              const emp = employeeById.get(payroll.employee_id);
                              return (
                                <tr key={payroll.id} className="hover:bg-slate-50 transition-colors">
                                  <td className="px-6 py-4 text-slate-500 text-sm">
                                    {new Date(payroll.payroll_date + "T00:00:00").toLocaleDateString("en-US", {
                                      month: "short",
                                      day: "2-digit",
                                      year: "numeric",
                                    })}
                                  </td>
                                  <td className="px-6 py-4 font-medium text-slate-900">{emp?.name}</td>
                                  <td className="px-6 py-4 text-right text-slate-700 font-mono">
                                    {Number(emp?.daily_rate ?? 0).toFixed(2)}
                                  </td>
                                  <td className="px-6 py-4 text-right text-slate-700 font-mono">
                                    {Number(payroll.days_worked).toFixed(2)}
                                  </td>
                                  <td className="px-6 py-4 text-right text-slate-700 font-mono">
                                    {Number(payroll.overtime_hours).toFixed(2)}
                                  </td>
                                  <td className="px-6 py-4 text-right text-emerald-600 font-medium font-mono">
                                    +{Number(payroll.overtime_pay).toFixed(2)}
                                  </td>
                                  <td
                                    className={`px-6 py-4 text-right font-bold font-mono ${
                                      isMf ? "text-amber-700" : "text-sky-700"
                                    }`}
                                  >
                                    {Number(payroll.total_salary).toFixed(2)}
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                  </section>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
