import { useEffect, useState, useCallback } from "react";
import { supabase } from "../supabaseClient";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/Card";
import { Button } from "./ui/Button";
import { ButtonSelect } from "./ui/ButtonSelect";
import { Input } from "./ui/Input";
import { Select } from "./ui/Select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/Table";
import { Alert } from "./ui/Alert";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/Dialog";
import { getErrorMessage } from "../lib/errors";
import { StatusBadge } from "./ui/StatusBadge";
import { formatCurrency } from "../lib/format";
import { useConfirm } from "./ui/ConfirmDialogContext";

type Period = {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  status: "OPEN" | "CLOSED";
  updated_at: string;
};

type ExportLog = {
  id: string;
  report_type: string;
  exported_at: string | null;
  notes: string;
};

type Account = {
  id: string;
  code: string;
  name: string;
  account_type: string;
};

type AccountBalance = {
  account_id: string;
  code: string;
  name: string;
  account_type?: string;
  opening_balance: number;
  debit_movement: number;
  credit_movement: number;
  closing_balance: number;
};

type GLLine = {
  journal_date: string;
  ref_type: string | null;
  ref_no: string | null;
  memo: string | null;
  debit: number | null;
  credit: number | null;
  trx_id?: string | null;
};

type PeriodInfo = {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
};

type ExportTableRow = Record<string, string | number | null>;

const toCsv = <T extends Record<string, string | number | null>>(rows: T[]) => {
  const headers = rows.length ? Object.keys(rows[0]) : [];
  const escape = (value: string | number | null) => {
    if (value === null || value === undefined) return "";
    const str = String(value);
    if (/[",\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
    return str;
  };
  const lines = [
    headers.join(","),
    ...rows.map((row) => headers.map((key) => escape(row[key])).join(",")),
  ];
  return lines.join("\n");
};

const downloadCsv = (filename: string, csv: string) => {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
};

const formatReportNumber = (value: number) =>
  value.toLocaleString("id-ID", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const escapeHtml = (value: string | number | null | undefined) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const renderPdfTable = (
  columns: Array<{ key: string; label: string; numeric?: boolean }>,
  rows: ExportTableRow[],
  getRowClass?: (row: ExportTableRow, index: number) => string,
) => {
  const header = `<tr>${columns
    .map(
      (column) =>
        `<th${column.numeric ? ` class="num"` : ""}>${escapeHtml(column.label)}</th>`,
    )
    .join("")}</tr>`;

  const body = rows
    .map((row, index) => {
      const rowClass = getRowClass?.(row, index) ?? "";
      const classAttr = rowClass ? ` class="${escapeHtml(rowClass)}"` : "";

      return `<tr${classAttr}>${columns
        .map((column) => {
          const rawValue = row[column.key];
          const cellValue =
            column.numeric && typeof rawValue === "number"
              ? formatReportNumber(rawValue)
              : escapeHtml(rawValue);

          return `<td${column.numeric ? ` class="num"` : ""}>${cellValue}</td>`;
        })
        .join("")}</tr>`;
    })
    .join("");

  return `<table>${header}${body}</table>`;
};

const getAccountType = (row: AccountBalance) => {
  if (row.account_type) return row.account_type;
  if (row.code?.startsWith("1")) return "ASSET";
  if (row.code?.startsWith("2")) return "LIABILITY";
  if (row.code?.startsWith("3")) return "EQUITY";
  if (row.code?.startsWith("4")) return "REVENUE";
  if (row.code?.startsWith("5")) return "COGS";
  return "EXPENSE";
};

const getPeriodAmount = (row: AccountBalance) =>
  getAccountType(row) === "REVENUE"
    ? row.credit_movement - row.debit_movement
    : row.debit_movement - row.credit_movement;

const getDisplayedClosingBalance = (row: AccountBalance, invert = false) =>
  invert ? -row.closing_balance : row.closing_balance;

const openPdfPrintWindow = (title: string, period: PeriodInfo, bodyHtml: string) => {
  const win = window.open("", "_blank");
  if (!win) return;
  const css = `
    @page { size: A4; margin: 16mm; }
    body { font-family: "Inter", Arial, sans-serif; color: #0f172a; }
    .toolbar { display: flex; justify-content: flex-end; margin: 0 0 12px; }
    .btn { background: #0f172a; color: #fff; border: 0; padding: 8px 12px; border-radius: 8px; font-size: 12px; cursor: pointer; }
    .btn:hover { background: #1e293b; }
    h1 { font-size: 18px; margin: 0 0 6px; }
    h2 { font-size: 14px; margin: 18px 0 8px; }
    .meta { font-size: 12px; color: #475569; margin-bottom: 16px; display: flex; justify-content: space-between; }
    .meta-line { margin: 0 0 12px; font-size: 12px; color: #0f172a; }
    table { width: 100%; border-collapse: collapse; font-size: 11px; }
    th, td { padding: 6px 8px; border-bottom: 1px solid #e2e8f0; }
    th { text-align: left; background: #f8fafc; font-weight: 600; }
    .num { text-align: right; font-variant-numeric: tabular-nums; }
    .total-row td { font-weight: 700; background: #f8fafc; }
    .section { margin-top: 16px; }
    @media print { .no-print { display: none !important; } }
  `;
  win.document.write(`
    <html>
      <head>
        <title>${title}</title>
        <style>${css}</style>
      </head>
      <body>
        <div class="toolbar no-print">
          <button class="btn" onclick="window.print()">Print / Save PDF</button>
        </div>
        <h1>${title}</h1>
        <div class="meta">
          <div>Period: ${period.start_date} – ${period.end_date}</div>
          <div>${period.name}</div>
        </div>
        ${bodyHtml}
      </body>
    </html>
  `);
  win.document.close();
  win.focus();
};

export default function PeriodLock() {
  const [periods, setPeriods] = useState<Period[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form
  const buildCurrentPeriodDefaults = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth(); // 0-11

    // Start: 1st of current month
    const start = new Date(year, month, 1);
    // End: 0th of next month = last day of current month
    const end = new Date(year, month + 1, 0);

    // Format YYYY-MM-DD using local time
    const toLocalYMD = (d: Date) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return `${y}-${m}-${day}`;
    };

    const name = start.toLocaleDateString("id-ID", {
      month: "long",
      year: "numeric",
    });
    return {
      name,
      start_date: toLocalYMD(start),
      end_date: toLocalYMD(end),
    };
  };

  const [formData, setFormData] = useState(buildCurrentPeriodDefaults);

  // Exports
  const [selectedPeriodId, setSelectedPeriodId] = useState("");
  const [logs, setLogs] = useState<ExportLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [exportType, setExportType] = useState("TB");
  const [exportFormat, setExportFormat] = useState<"PDF" | "CSV">("PDF");
  const [glAccountId, setGlAccountId] = useState("");
  const [exporting, setExporting] = useState(false);
  const selectedGlAccount =
    accounts.find((account) => account.id === glAccountId) ?? null;
  const getExportSignature = (
    type: string,
    format: "CSV" | "PDF",
    account: Account | null = selectedGlAccount,
  ) => {
    if (type === "GL") {
      return account ? `GL_${format}_${account.code}` : `GL_${format}`;
    }

    return `${type}_${format}`;
  };
  const currentExportSignature =
    exportType === "GL" && !selectedGlAccount
      ? null
      : getExportSignature(exportType, exportFormat);
  const existingExport = currentExportSignature
    ? logs.find((log) => log.report_type === currentExportSignature)
    : undefined;
  const existingExportStamp = existingExport?.exported_at
    ? new Date(existingExport.exported_at).toLocaleString()
    : null;
  const [closeModalOpen, setCloseModalOpen] = useState(false);
  const [closingPeriod, setClosingPeriod] = useState<Period | null>(null);
  const [closingAmount, setClosingAmount] = useState<number | null>(null);
  const [closingSkipped, setClosingSkipped] = useState(false);
  const [closingLoading, setClosingLoading] = useState(false);
  const [closingError, setClosingError] = useState<string | null>(null);
  const { confirm } = useConfirm();

  // -- 1. PERIODS OPS --
  // Wrap in useCallback to allow usage in useEffect dependency
  const fetchPeriods = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("accounting_periods")
      .select("*")
      .order("start_date", { ascending: false });

    if (error) setError(error.message);
    else setPeriods(data || []);
    setLoading(false);
  }, []);

  async function handleCreate() {
    if (!formData.name || !formData.start_date || !formData.end_date) {
      setError("All fields required");
      return;
    }
    setError(null);
    setSuccess(null);

    const { error } = await supabase.rpc("rpc_create_period", {
      p_name: formData.name,
      p_start_date: formData.start_date,
      p_end_date: formData.end_date,
    });

    if (error) setError(error.message);
    else {
      setSuccess("Period Created");
      setFormData(buildCurrentPeriodDefaults());
      fetchPeriods();
    }
  }

  async function toggleStatus(p: Period) {
    if (p.status === "OPEN") {
      await openCloseModal(p);
      return;
    }

    const ok = await confirm({
      title: "Re-open Period",
      description: "Re-open this period? This will allow new transactions.",
      confirmText: "Re-open",
      cancelText: "Cancel",
      tone: "danger",
    });
    if (!ok) return;
    const { error } = await supabase.rpc("rpc_set_period_status", {
      p_period_id: p.id,
      p_status: "OPEN",
    });
    if (error) setError(error.message);
    else fetchPeriods();
  }

  // -- 2. EXPORTS OPS --
  const fetchAccounts = useCallback(async () => {
    const { data, error } = await supabase
      .from("accounts")
      .select("id,code,name,account_type")
      .order("code");

    if (error) setError(error.message);
    else setAccounts((data || []) as Account[]);
  }, []);

  const fetchLogs = useCallback(async (periodId: string) => {
    setSelectedPeriodId(periodId);
    setLogsLoading(true);
    setLogs([]);
    const { data, error } = await supabase
      .from("period_exports")
      .select("*")
      .eq("period_id", periodId)
      .order("exported_at", { ascending: false });

    if (error) setError(error.message);
    else setLogs(data || []);
    setLogsLoading(false);
  }, []);

  const fetchPeriodInfo = useCallback(async () => {
    if (!selectedPeriodId) return null;
    const { data, error } = await supabase
      .from("accounting_periods")
      .select("id,name,start_date,end_date")
      .eq("id", selectedPeriodId)
      .single();
    if (error) {
      setError(error.message);
      return null;
    }
    return data as PeriodInfo;
  }, [selectedPeriodId]);

  const buildExportNotes = (
    type: string,
    account: Account | null = selectedGlAccount,
  ) => {
    if (type === "GL" && account) {
      return `Manual Export via UI | Account: ${account.code} - ${account.name}`;
    }

    return "Manual Export via UI";
  };

  const openCloseModal = async (p: Period) => {
    setClosingPeriod(p);
    setCloseModalOpen(true);
    setClosingError(null);
    setClosingAmount(null);
    setClosingSkipped(false);
    setClosingLoading(true);
    try {
      const { data, error } = await supabase.rpc("rpc_get_account_balances", {
        p_start_date: p.start_date,
        p_end_date: p.end_date,
      });
      if (error) throw error;
      const row = (data || []).find((r: { code: string }) => r.code === "1310");
      if (!row) {
        throw new Error("Persediaan Bahan Baku (1310) tidak ditemukan di Trial Balance.");
      }
      const amount = Number(row.closing_balance) || 0;
      setClosingAmount(amount);
      setClosingSkipped(amount === 0);
    } catch (err: unknown) {
      setClosingError(getErrorMessage(err));
    } finally {
      setClosingLoading(false);
    }
  };

  const handleCloseAndLock = async () => {
    if (!closingPeriod) return;
    setClosingLoading(true);
    setClosingError(null);
    try {
      const { data: existingClose, error: existingError } = await supabase
        .from("journals")
        .select("id")
        .eq("ref_type", "period_close_hpp")
        .eq("ref_id", closingPeriod.id)
        .limit(1);
      if (existingError) throw existingError;

      const shouldClose =
        (!existingClose || existingClose.length === 0) &&
        (closingAmount ?? 0) > 0;
      if (shouldClose) {
        const { error: closeError } = await supabase.rpc("rpc_close_period_hpp", {
          p_period_id: closingPeriod.id,
        });
        if (closeError) throw closeError;
      }

      const { error: lockError } = await supabase.rpc("rpc_set_period_status", {
        p_period_id: closingPeriod.id,
        p_status: "CLOSED",
      });
      if (lockError) throw lockError;

      if (shouldClose) {
        setSuccess("Closing HPP dibuat dan periode berhasil di-lock.");
      } else if (existingClose && existingClose.length > 0) {
        setSuccess("Periode berhasil di-lock (closing HPP sudah ada).");
      } else {
        setSuccess("Periode berhasil di-lock (closing HPP tidak dibuat karena saldo 0).");
      }
      setCloseModalOpen(false);
      fetchPeriods();
    } catch (err: unknown) {
      setClosingError(getErrorMessage(err));
    } finally {
      setClosingLoading(false);
    }
  };

  async function handleExport(
    type: string,
    format: "CSV" | "PDF" = "CSV",
    skipLog = false,
  ) {
    if (!selectedPeriodId) return;
    setError(null);
    const periodInfo = await fetchPeriodInfo();
    if (!periodInfo) return;

    const exportSignature = getExportSignature(type, format);
    const glFileSuffix =
      type === "GL" && selectedGlAccount ? `_${selectedGlAccount.code}` : "";
    const baseName = `${type}_${periodInfo.name}_${periodInfo.start_date}_${periodInfo.end_date}${glFileSuffix}`;

    try {
      if (type === "TB" || type === "PL" || type === "BS") {
        const { data, error } = await supabase.rpc("rpc_get_account_balances", {
          p_start_date: periodInfo.start_date,
          p_end_date: periodInfo.end_date,
        });
        if (error) throw error;
        const balances = (data || []) as AccountBalance[];
        const assets = balances.filter((row) => getAccountType(row) === "ASSET");
        const liabilities = balances.filter(
          (row) => getAccountType(row) === "LIABILITY",
        );
        const equity = balances.filter((row) => getAccountType(row) === "EQUITY");
        const revenue = balances.filter((row) => getAccountType(row) === "REVENUE");
        const cogs = balances.filter((row) => getAccountType(row) === "COGS");
        const expense = balances.filter((row) => getAccountType(row) === "EXPENSE");
        const sumClosing = (rows: AccountBalance[]) =>
          rows.reduce((total, row) => total + row.closing_balance, 0);
        const sumPeriod = (rows: AccountBalance[]) =>
          rows.reduce((total, row) => total + getPeriodAmount(row), 0);

        const tbRows = balances.map((row) => ({
          code: row.code,
          name: row.name,
          opening_balance: row.opening_balance,
          debit_movement: row.debit_movement,
          credit_movement: row.credit_movement,
          closing_balance: row.closing_balance,
        }));

        const periodRevenue = sumPeriod(revenue);
        const periodCogs = sumPeriod(cogs);
        const periodExpense = sumPeriod(expense);
        const grossProfit = periodRevenue - periodCogs;
        const periodNetIncome = grossProfit - periodExpense;
        const currentYearEarnings = -(sumClosing(revenue) + sumClosing(cogs) + sumClosing(expense));
        const totalAsset = sumClosing(assets);
        const totalLiabilities = -sumClosing(liabilities);
        const totalEquity = -sumClosing(equity) + currentYearEarnings;
        const totalLiabilitiesAndEquity = totalLiabilities + totalEquity;
        const balanceDifference = totalAsset - totalLiabilitiesAndEquity;

        const plRows = [
          ...revenue.map((row) => ({
            section: "Revenue",
            code: row.code,
            name: row.name,
            amount: getPeriodAmount(row),
          })),
          {
            section: "Revenue",
            code: "TOTAL",
            name: "Total Revenue",
            amount: periodRevenue,
          },
          ...cogs.map((row) => ({
            section: "COGS",
            code: row.code,
            name: row.name,
            amount: getPeriodAmount(row),
          })),
          {
            section: "COGS",
            code: "TOTAL",
            name: "Total COGS",
            amount: periodCogs,
          },
          {
            section: "Summary",
            code: "GROSS",
            name: "Gross Profit",
            amount: grossProfit,
          },
          ...expense.map((row) => ({
            section: "Expense",
            code: row.code,
            name: row.name,
            amount: getPeriodAmount(row),
          })),
          {
            section: "Expense",
            code: "TOTAL",
            name: "Total Expenses",
            amount: periodExpense,
          },
          {
            section: "Summary",
            code: "NET",
            name: "Net Income",
            amount: periodNetIncome,
          },
        ];

        const bsRows = [
          ...assets.map((row) => ({
            section: "Assets",
            code: row.code,
            name: row.name,
            amount: getDisplayedClosingBalance(row),
          })),
          {
            section: "Assets",
            code: "TOTAL",
            name: "Total Assets",
            amount: totalAsset,
          },
          ...liabilities.map((row) => ({
            section: "Liabilities",
            code: row.code,
            name: row.name,
            amount: getDisplayedClosingBalance(row, true),
          })),
          {
            section: "Liabilities",
            code: "TOTAL",
            name: "Total Liabilities",
            amount: totalLiabilities,
          },
          ...equity.map((row) => ({
            section: "Equity",
            code: row.code,
            name: row.name,
            amount: getDisplayedClosingBalance(row, true),
          })),
          {
            section: "Equity",
            code: "RET",
            name: "Current Year Earnings",
            amount: currentYearEarnings,
          },
          {
            section: "Equity",
            code: "TOTAL",
            name: "Total Equity",
            amount: totalEquity,
          },
          {
            section: "Summary",
            code: "TOTAL",
            name: "Total Liabilities & Equity",
            amount: totalLiabilitiesAndEquity,
          },
          {
            section: "Summary",
            code: "DIFF",
            name: "Balance Difference",
            amount: balanceDifference,
          },
        ];

        if (type === "TB") {
          const columns = [
            { key: "code", label: "Code" },
            { key: "name", label: "Name" },
            { key: "opening_balance", label: "Opening", numeric: true },
            { key: "debit_movement", label: "Debit", numeric: true },
            { key: "credit_movement", label: "Credit", numeric: true },
            { key: "closing_balance", label: "Closing", numeric: true },
          ];

          if (format === "CSV") {
            downloadCsv(`${baseName}.csv`, toCsv(tbRows));
          } else {
            openPdfPrintWindow(
              "Trial Balance",
              periodInfo,
              renderPdfTable(columns, tbRows),
            );
          }
        } else if (type === "PL") {
          const columns = [
            { key: "section", label: "Section" },
            { key: "code", label: "Code" },
            { key: "name", label: "Name" },
            { key: "amount", label: "Amount", numeric: true },
          ];

          if (format === "CSV") {
            downloadCsv(`${baseName}.csv`, toCsv(plRows));
          } else {
            openPdfPrintWindow(
              "Profit & Loss",
              periodInfo,
              renderPdfTable(
                columns,
                plRows,
                (row) =>
                  String(row.name).startsWith("Total ") ||
                  row.name === "Gross Profit" ||
                  row.name === "Net Income"
                    ? "total-row"
                    : "",
              ),
            );
          }
        } else {
          const columns = [
            { key: "section", label: "Section" },
            { key: "code", label: "Code" },
            { key: "name", label: "Name" },
            { key: "amount", label: "Amount", numeric: true },
          ];

          if (format === "CSV") {
            downloadCsv(`${baseName}.csv`, toCsv(bsRows));
          } else {
            openPdfPrintWindow(
              "Balance Sheet",
              periodInfo,
              renderPdfTable(
                columns,
                bsRows,
                (row) =>
                  row.name === "Current Year Earnings" ||
                  String(row.name).startsWith("Total ") ||
                  row.name === "Balance Difference"
                    ? "total-row"
                    : "",
              ),
            );
          }
        }
      } else if (type === "CF") {
        const { data, error } = await supabase.rpc("rpc_get_cashflow", {
          p_start_date: periodInfo.start_date,
          p_end_date: periodInfo.end_date,
        });
        if (error) throw error;

        const rows = ((data || []) as CashflowLine[]).map((row) => ({
          category: row.category,
          description: row.description,
          amount: Number(row.amount ?? 0),
        }));

        const columns = [
          { key: "category", label: "Category" },
          { key: "description", label: "Description" },
          { key: "amount", label: "Amount", numeric: true },
        ];

        if (format === "CSV") {
          downloadCsv(`${baseName}.csv`, toCsv(rows));
        } else {
          openPdfPrintWindow(
            "Cash Flow",
            periodInfo,
            renderPdfTable(
              columns,
              rows,
              (row) => (row.category === "Closing" ? "total-row" : ""),
            ),
          );
        }
      } else if (type === "GL") {
        if (!selectedGlAccount) {
          throw new Error("Pilih akun untuk export General Ledger.");
        }

        const { data, error } = await supabase.rpc("rpc_get_gl", {
          p_account_id: selectedGlAccount.id,
          p_start_date: periodInfo.start_date,
          p_end_date: periodInfo.end_date,
        });
        if (error) throw error;

        const sortedRows = ((data || []) as GLLine[])
          .map((row) => ({
            journal_date: row.journal_date || "",
            ref_type: row.ref_type || "",
            ref_no: row.ref_no || "",
            memo: row.memo || "",
            debit: Number(row.debit ?? 0),
            credit: Number(row.credit ?? 0),
          }))
          .sort((left, right) => {
            const dateCompare = left.journal_date.localeCompare(right.journal_date);
            if (dateCompare !== 0) return dateCompare;

            const leftRank = left.ref_type === "OPENING_BALANCE" ? 0 : 1;
            const rightRank = right.ref_type === "OPENING_BALANCE" ? 0 : 1;
            return leftRank - rightRank;
          });

        let runningBalance = 0;
        const rows = sortedRows.map((row) => {
          runningBalance += row.debit - row.credit;

          return {
            journal_date: row.journal_date,
            ref_type: row.ref_type,
            ref_no: row.ref_no,
            memo: row.memo,
            debit: row.debit,
            credit: row.credit,
            running_balance: runningBalance,
          };
        });

        const columns = [
          { key: "journal_date", label: "Date" },
          { key: "ref_type", label: "Reference Type" },
          { key: "ref_no", label: "Reference" },
          { key: "memo", label: "Description" },
          { key: "debit", label: "Debit", numeric: true },
          { key: "credit", label: "Credit", numeric: true },
          { key: "running_balance", label: "Running Balance", numeric: true },
        ];

        if (format === "CSV") {
          downloadCsv(`${baseName}.csv`, toCsv(rows));
        } else {
          openPdfPrintWindow(
            `General Ledger - ${selectedGlAccount.code}`,
            periodInfo,
            `<p class="meta-line">Account: ${escapeHtml(selectedGlAccount.code)} - ${escapeHtml(selectedGlAccount.name)}</p>${renderPdfTable(
              columns,
              rows,
              (row) => (row.ref_type === "OPENING_BALANCE" ? "total-row" : ""),
            )}`,
          );
        }
      } else {
        throw new Error(`Unsupported report type: ${type}`);
      }

      if (!skipLog) {
        const { error: logError } = await supabase.rpc(
          "rpc_export_period_reports",
          {
            p_period_id: selectedPeriodId,
            p_report_type: exportSignature,
            p_notes: buildExportNotes(type),
          }
        );
        if (logError) setError(logError.message);
        fetchLogs(selectedPeriodId);
      }
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    }
  }

  const handleExportClick = async () => {
    if (!selectedPeriodId || exporting) return;
    setExporting(true);
    try {
      await handleExport(exportType, exportFormat, !!existingExport);
      if (existingExport) {
        const exportLabel =
          exportType === "GL" && selectedGlAccount
            ? `${exportType} ${selectedGlAccount.code}`
            : exportType;
        setSuccess(
          `Export ${exportLabel} (${exportFormat}) dibuka dari log ${existingExportStamp ? `(${existingExportStamp})` : ""
          } tanpa membuat log baru.`
        );
      }
    } finally {
      setExporting(false);
    }
  };

  // Use effects at the end of definitions
  useEffect(() => {
    fetchPeriods();
  }, [fetchPeriods]);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  return (
    <div className="w-full space-y-8">
      <h2 className="hidden md:block text-3xl font-bold tracking-tight text-gray-900">
        Period Management
      </h2>

      {error && <Alert variant="error" title="Kesalahan" description={error} />}
      {success && (
        <Alert variant="success" title="Berhasil" description={success} />
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-8">
        <Card className="md:col-span-1 shadow-md h-fit">
          <CardHeader className="bg-gray-50 border-b border-gray-100">
            <CardTitle>Create Accounting Period</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-6">
            <Input
              label="Name (e.g. 2024-01)"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              placeholder="YYYY-MM"
            />
            <Input
              label="Start Date"
              type="date"
              value={formData.start_date}
              onChange={(e) =>
                setFormData({ ...formData, start_date: e.target.value })
              }
            />
            <Input
              label="End Date"
              type="date"
              value={formData.end_date}
              onChange={(e) =>
                setFormData({ ...formData, end_date: e.target.value })
              }
            />
            <Button
              className="w-full bg-blue-600 hover:bg-blue-700"
              onClick={handleCreate}
              disabled={loading}
            >
              Create Period
            </Button>
          </CardContent>
        </Card>

        <Card className="md:col-span-2 shadow-md">
          <CardHeader className="bg-gray-50 border-b border-gray-100">
            <CardTitle>Existing Periods</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Start</TableHead>
                    <TableHead>End</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {periods.map((p) => (
                    <TableRow
                      key={p.id}
                      className={
                        p.status === "CLOSED" ? "bg-gray-50 opacity-75" : ""
                      }
                    >
                      <TableCell className="font-medium">{p.name}</TableCell>
                      <TableCell>{p.start_date}</TableCell>
                      <TableCell>{p.end_date}</TableCell>
                      <TableCell>
                        <StatusBadge status={p.status} />
                      </TableCell>
                      <TableCell className="flex gap-2">
                        <Button
                          size="sm"
                          variant={p.status === "OPEN" ? "danger" : "outline"}
                          onClick={() => toggleStatus(p)}
                        >
                          {p.status === "OPEN" ? "Close HPP & Lock" : "Re-open"}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => fetchLogs(p.id)}
                        >
                          Exports
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      {selectedPeriodId && (
        <Card className="shadow-md border-blue-200">
          <CardHeader className="bg-blue-50 border-b border-blue-100">
            <CardTitle className="text-blue-900">
              Export Management for Selected Period
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <ButtonSelect
                label="Report"
                value={exportType}
                onChange={setExportType}
                options={[
                  { label: "Trial Balance", value: "TB" },
                  { label: "Balance Sheet", value: "BS" },
                  { label: "Profit & Loss", value: "PL" },
                  { label: "Cash Flow", value: "CF" },
                  { label: "General Ledger", value: "GL" },
                ]}
              />
              <ButtonSelect
                label="Format"
                value={exportFormat}
                onChange={(val) => setExportFormat(val as "PDF" | "CSV")}
                options={[
                  { label: "PDF (Preview)", value: "PDF" },
                  { label: "CSV (Download)", value: "CSV" },
                ]}
              />
              {exportType === "GL" && (
                <Select
                  label="Ledger Account"
                  value={glAccountId}
                  onValueChange={setGlAccountId}
                  placeholder="Select an account"
                  searchPlaceholder="Search account..."
                  className="!mb-0"
                  options={[
                    { label: "-- Select an Account --", value: "" },
                    ...accounts.map((account) => ({
                      label: `${account.code} - ${account.name}`,
                      value: account.id,
                      searchText: `${account.code} ${account.name} ${account.account_type}`,
                    })),
                  ]}
                />
              )}
              <div className="flex flex-col justify-end gap-2">
                {existingExport && (
                  <p className="text-xs text-amber-600">
                    Sudah ada di log untuk report ini{existingExportStamp ? ` (${existingExportStamp})` : ""}. Klik Export untuk membuka preview tanpa membuat log baru.
                  </p>
                )}
                {exportType === "GL" && !selectedGlAccount && (
                  <p className="text-xs text-slate-500">
                    Pilih akun terlebih dahulu untuk export General Ledger.
                  </p>
                )}
                <Button
                  onClick={handleExportClick}
                  disabled={
                    exporting ||
                    logsLoading ||
                    (exportType === "GL" && !selectedGlAccount)
                  }
                  className="bg-indigo-600 hover:bg-indigo-700 text-white h-10"
                >
                  {exporting
                    ? "Exporting..."
                    : existingExport
                      ? exportFormat === "PDF"
                        ? "Open Preview"
                        : "Download CSV"
                      : "Export"}
                </Button>
                <p className="text-xs text-slate-500">
                  PDF akan dibuka di tab baru, CSV akan terunduh otomatis.
                </p>
              </div>
            </div>

            <h4 className="font-semibold text-gray-700 mb-2">Export Logs</h4>
            <div className="rounded-md border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-gray-50">
                    <TableRow>
                      <TableHead>Timestamp</TableHead>
                      <TableHead>Report</TableHead>
                      <TableHead>Notes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={3}
                          className="text-center text-gray-400 italic"
                        >
                          No exports recorded
                        </TableCell>
                      </TableRow>
                    ) : (
                      logs.map((log) => (
                        <TableRow key={log.id}>
                          <TableCell>
                            {log.exported_at
                              ? new Date(log.exported_at).toLocaleString()
                              : "Timestamp unavailable"}
                          </TableCell>
                          <TableCell className="font-mono">
                            {log.report_type}
                          </TableCell>
                          <TableCell>{log.notes}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog isOpen={closeModalOpen} onClose={() => setCloseModalOpen(false)}>
        <DialogHeader>
          <DialogTitle>Closing HPP Bulanan</DialogTitle>
        </DialogHeader>
        <DialogContent className="sm:max-w-lg">
          <div className="space-y-4 text-sm text-slate-700">
            <p>
              Periode:{" "}
              <span className="font-semibold">
                {closingPeriod?.name} ({closingPeriod?.start_date} – {closingPeriod?.end_date})
              </span>
            </p>
            {closingError && (
              <Alert variant="error" title="Error" description={closingError} />
            )}
            <div className="rounded-lg border border-slate-200 p-3 bg-slate-50">
              <div className="flex items-center justify-between">
                <span>Debit 5100 - HPP</span>
                <span className="font-semibold">
                  {closingAmount !== null ? formatCurrency(closingAmount) : "-"}
                </span>
              </div>
              <div className="flex items-center justify-between mt-2">
                <span>Credit 1310 - Persediaan Bahan Baku</span>
                <span className="font-semibold">
                  {closingAmount !== null ? formatCurrency(closingAmount) : "-"}
                </span>
              </div>
              {closingSkipped && (
                <div className="mt-3 text-xs text-amber-600">
                  Skipped (saldo 0)
                </div>
              )}
            </div>
            <p className="text-xs text-slate-500">
              Nilai diambil otomatis dari saldo Trial Balance akun 1310 pada periode ini.
            </p>
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setCloseModalOpen(false)} disabled={closingLoading}>
              Cancel
            </Button>
            <Button onClick={handleCloseAndLock} disabled={closingLoading || closingAmount === null}>
              {closingLoading ? "Processing..." : "Create Closing & Lock"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
