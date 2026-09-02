import React, { useState, useMemo, useEffect, useCallback } from "react";
import {
  ArrowLeftRight, Building2, MapPin, Phone, Mail, Calendar, Users,
  Briefcase, User, LogOut, Search, FileText, CheckCircle2, Plus,
  Trash2, Edit3, ChevronRight, Loader2, AlertCircle, Info, ShieldCheck,
  Home, RotateCcw, X, List
} from "lucide-react";

/* ---------------------------------------------------------------------- */
/*  Reference data                                                        */
/* ---------------------------------------------------------------------- */

const ORGS = [
  "Life Insurance Corporation of India",
  "Reserve Bank of India",
  "State Bank of India",
  "Punjab National Bank",
  "Bank of Baroda",
  "Canara Bank",
  "Union Bank of India",
  "Indian Bank",
  "Bank of India",
  "Central Bank of India",
  "NABARD",
  "Other",
];

const BRANCH_TYPES = [
  "Rural",
  "Semi-Urban",
  "Urban",
  "Metropolitan",
  "Branch Office",
  "Regional Office",
  "Zonal Office",
  "Head Office",
];

const DEPARTMENTS = [
  "Branch Banking / Retail",
  "Credit / Loans",
  "Operations",
  "Treasury",
  "Foreign Exchange",
  "IT / Technology",
  "Human Resources",
  "Audit & Inspection",
  "Recovery",
  "Priority Sector / Agriculture",
  "Customer Service",
  "Compliance & Risk",
  "Marketing / Business Development",
  "Administration",
  "Other",
];

const CITIES = [
  "Mumbai","Delhi","Bengaluru","Hyderabad","Chennai","Kolkata","Pune",
  "Ahmedabad","Jaipur","Lucknow","Kanpur","Nagpur","Indore","Bhopal",
  "Patna","Vadodara","Ludhiana","Agra","Nashik","Varanasi","Coimbatore",
  "Kochi","Chandigarh","Guwahati","Bhubaneswar","Dehradun","Raipur",
  "Ranchi","Jodhpur","Amritsar","Allahabad","Gwalior","Vijayawada",
  "Madurai","Meerut","Jabalpur","Thiruvananthapuram","Mysuru","Shimla",
  "Panaji","Surat","Rajkot","Udaipur","Siliguri","Gurugram","Noida",
  "Faridabad","Visakhapatnam","Nagercoil","Kolhapur","Aurangabad",
];

const BLOCKED_PERSONAL_DOMAINS = [
  "gmail.com","yahoo.com","yahoo.co.in","hotmail.com","outlook.com",
  "rediffmail.com","icloud.com","live.com","aol.com","protonmail.com",
];

const emptyForm = {
  name: "",
  email: "",
  organization: "",
  organizationOther: "",
  officialPhone: "",
  altPhone: "",
  currentCity: "",
  desiredCity: "",
  branchName: "",
  branchCode: "",
  branchType: "",
  role: "",
  grade: "",
  department: "",
  seniorityYears: "",
  withFamily: "no",
  dependents: "",
  transferDate: "",
  managerName: "",
  reason: "",
  notes: "",
  consent: false,
};

const norm = (s) => (s || "").trim().toLowerCase();

/* ---------------------------------------------------------------------- */
/*  Small building blocks                                                 */
/* ---------------------------------------------------------------------- */

function SwapBadge({ a = "A", b = "B", size = 64 }) {
  const s = size;
  return (
    <svg width={s} height={s * 0.62} viewBox="0 0 120 74" fill="none">
      <circle cx="30" cy="37" r="26" fill="var(--navy)" />
      <text x="30" y="44" textAnchor="middle" className="tx-badge-letter">{a}</text>
      <circle cx="90" cy="37" r="26" fill="var(--marigold)" />
      <text x="90" y="44" textAnchor="middle" className="tx-badge-letter tx-badge-letter-dark">{b}</text>
      <path d="M50 24 C62 14, 66 14, 76 22" stroke="var(--ink)" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      <path d="M76 22 l6 -2 l-1 7 z" fill="var(--ink)" />
      <path d="M70 50 C58 60, 54 60, 44 52" stroke="var(--ink)" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      <path d="M44 52 l-6 2 l1 -7 z" fill="var(--ink)" />
    </svg>
  );
}

function Field({ label, required, children, hint, className = "" }) {
  return (
    <label className={"tx-field " + className}>
      <span className="tx-field-label">
        {label}{required && <span className="tx-required">*</span>}
      </span>
      {children}
      {hint && <span className="tx-field-hint">{hint}</span>}
    </label>
  );
}

function TextInput(props) {
  return <input {...props} className={"tx-input " + (props.className || "")} />;
}

function Select({ children, ...props }) {
  return <select {...props} className={"tx-input tx-select " + (props.className || "")}>{children}</select>;
}

function Banner({ kind = "info", children, onClose }) {
  const Icon = kind === "error" ? AlertCircle : kind === "success" ? CheckCircle2 : Info;
  return (
    <div className={"tx-banner tx-banner-" + kind}>
      <Icon size={16} />
      <span>{children}</span>
      {onClose && <button className="tx-banner-close" onClick={onClose}><X size={14} /></button>}
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/*  App                                                                    */
/* ---------------------------------------------------------------------- */

export default function App() {
  const [stage, setStage] = useState("email"); // email | otp | app
  const [email, setEmail] = useState("");
  const [skipDomainCheck, setSkipDomainCheck] = useState(true);
  const [authError, setAuthError] = useState("");
  const [sentOtp, setSentOtp] = useState("");
  const [otpInput, setOtpInput] = useState("");
  const [busy, setBusy] = useState(false);

  const [tab, setTab] = useState("myrequest"); // myrequest | matches
  const [form, setForm] = useState(emptyForm);
  const [myRequest, setMyRequest] = useState(null);
  const [editing, setEditing] = useState(false);
  const [saveMsg, setSaveMsg] = useState(null); // {kind, text}
  const [saving, setSaving] = useState(false);
  const [loadingUser, setLoadingUser] = useState(false);

  const [tolerance, setTolerance] = useState(5);
  const [matchLoading, setMatchLoading] = useState(false);
  const [matchError, setMatchError] = useState("");
  const [strongMatches, setStrongMatches] = useState([]);
  const [looseMatches, setLooseMatches] = useState([]);
  const [searched, setSearched] = useState(false);

  const [browseAll, setBrowseAll] = useState([]);
  const [browseLoading, setBrowseLoading] = useState(false);
  const [browseError, setBrowseError] = useState("");
  const [browseLoaded, setBrowseLoaded] = useState(false);

  const key = (e) => `request:${norm(e)}`;

  /* ---------------- auth ---------------- */

  function validateOfficialEmail(raw) {
    const e = norm(raw);
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!re.test(e)) return "Enter a valid email address.";
    if (skipDomainCheck) return "";
    const domain = e.split("@")[1];
    if (BLOCKED_PERSONAL_DOMAINS.includes(domain)) {
      return "Please use your official organizational email address, not a personal one.";
    }
    return "";
  }

  function sendOtp() {
    const err = validateOfficialEmail(email);
    if (err) { setAuthError(err); return; }
    setAuthError("");
    const code = String(Math.floor(100000 + Math.random() * 900000));
    setSentOtp(code);
    setOtpInput("");
    setStage("otp");
  }

  async function verifyOtp() {
    if (otpInput.trim() !== sentOtp) {
      setAuthError("That code doesn't match. Please try again.");
      return;
    }
    setAuthError("");
    setBusy(true);
    setLoadingUser(true);
    try {
      const res = await window.storage.get(key(email), true);
      if (res && res.value) {
        const record = JSON.parse(res.value);
        setMyRequest(record);
        setForm({ ...emptyForm, ...record });
      } else {
        setMyRequest(null);
        setForm({ ...emptyForm, email: norm(email) });
        setEditing(true);
      }
    } catch (e) {
      setMyRequest(null);
      setForm({ ...emptyForm, email: norm(email) });
      setEditing(true);
    } finally {
      setLoadingUser(false);
      setBusy(false);
      setStage("app");
      setTab("myrequest");
    }
  }

  function signOut() {
    setStage("email");
    setEmail("");
    setOtpInput("");
    setSentOtp("");
    setAuthError("");
    setForm(emptyForm);
    setMyRequest(null);
    setEditing(false);
    setSaveMsg(null);
    setStrongMatches([]);
    setLooseMatches([]);
    setSearched(false);
    setBrowseAll([]);
    setBrowseLoaded(false);
    setBrowseError("");
    setTab("myrequest");
  }

  /* ---------------- request form ---------------- */

  function setField(k, v) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  function validateForm() {
    const required = [
      ["name", "Full name"], ["organization", "Organisation"],
      ["officialPhone", "Official phone"], ["currentCity", "Current city"],
      ["desiredCity", "Desired city"], ["branchName", "Branch name"],
      ["branchType", "Branch type"], ["role", "Role / designation"],
      ["department", "Department"],
      ["seniorityYears", "Years of service"], ["transferDate", "Intended transfer date"],
      ["managerName", "Current manager"], ["reason", "Reason for transfer"],
    ];
    for (const [k, label] of required) {
      if (!String(form[k] || "").trim()) return `${label} is required.`;
    }
    if (form.organization === "Other" && !form.organizationOther.trim()) {
      return "Please name your organisation.";
    }
    if (norm(form.currentCity) === norm(form.desiredCity)) {
      return "Current city and desired city can't be the same.";
    }
    if (!/^\d{10}$/.test(form.officialPhone.replace(/\D/g, ""))) {
      return "Official phone should be a 10-digit number.";
    }
    if (isNaN(Number(form.seniorityYears)) || Number(form.seniorityYears) < 0) {
      return "Years of service should be a number.";
    }
    if (!form.consent) {
      return "Please confirm you consent to sharing these details with a matched counterpart.";
    }
    return "";
  }

  async function saveRequest() {
    const err = validateForm();
    if (err) { setSaveMsg({ kind: "error", text: err }); return; }
    setSaving(true);
    setSaveMsg(null);
    const record = {
      ...form,
      email: norm(email),
      organizationFinal: form.organization === "Other" ? form.organizationOther.trim() : form.organization,
      createdAt: myRequest?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    try {
      const res = await window.storage.set(key(email), JSON.stringify(record), true);
      if (!res) throw new Error("no result");
      setMyRequest(record);
      setEditing(false);
      setSaveMsg({ kind: "success", text: "Your transfer request has been saved." });
    } catch (e) {
      setSaveMsg({ kind: "error", text: "Couldn't save your request right now. Please try again." });
    } finally {
      setSaving(false);
    }
  }

  async function deleteRequest() {
    setSaving(true);
    try {
      await window.storage.delete(key(email), true);
      setMyRequest(null);
      setForm({ ...emptyForm, email: norm(email) });
      setEditing(true);
      setSaveMsg({ kind: "info", text: "Your request has been withdrawn." });
    } catch (e) {
      setSaveMsg({ kind: "error", text: "Couldn't withdraw the request. Please try again." });
    } finally {
      setSaving(false);
    }
  }

  /* ---------------- matching ---------------- */

  const runSearch = useCallback(async () => {
    if (!myRequest) { setMatchError("Submit your request first, then search for a match."); return; }
    setMatchLoading(true);
    setMatchError("");
    setSearched(true);
    try {
      const listRes = await window.storage.list("request:", true);
      const keys = (listRes && listRes.keys) || [];

      
     const others = [];

for (const k of keys) {
  // Do not match the employee against their own request.
  if (k === key(email)) continue;

  try {
    const r = await window.storage.get(k, true);
    if (r && r.value) others.push(JSON.parse(r.value));
  } catch (e) {}
}


      
      const org = myRequest.organizationFinal || myRequest.organization;
      const cityMatch = (r) =>
        norm(r.currentCity) === norm(myRequest.desiredCity) &&
        norm(r.desiredCity) === norm(myRequest.currentCity);
      const orgMatch = (r) => norm(r.organizationFinal || r.organization) === norm(org);
      const roleMatch = (r) => norm(r.role) === norm(myRequest.role);
      const senMatch = (r) =>
        Math.abs(Number(r.seniorityYears || 0) - Number(myRequest.seniorityYears || 0)) <= Number(tolerance || 0);

      const strong = others.filter((r) => orgMatch(r) && cityMatch(r) && roleMatch(r) && senMatch(r));
      const loose = others.filter(
        (r) => orgMatch(r) && cityMatch(r) && !(roleMatch(r) && senMatch(r))
      );
      setStrongMatches(strong);
      setLooseMatches(loose);
    } catch (e) {
      setMatchError("Couldn't fetch matches right now. Please try again.");
    } finally {
      setMatchLoading(false);
    }
  }, [myRequest, tolerance, email]);

  /* ---------------- browse (list + filter) ---------------- */

  const runBrowse = useCallback(async () => {
    if (!myRequest) { setBrowseError("Submit your request first, then browse open requests."); return; }
    setBrowseLoading(true);
    setBrowseError("");
    try {
      const listRes = await window.storage.list("request:", true);
      const keys = (listRes && listRes.keys) || [];
      const others = [];
      for (const k of keys) {
      
        try {
          const r = await window.storage.get(k, true);
          if (r && r.value) others.push(JSON.parse(r.value));
        } catch (e) { /* skip unreadable record */ }
      }
      const org = myRequest.organizationFinal || myRequest.organization;
      const sameOrg = others.filter((r) => norm(r.organizationFinal || r.organization) === norm(org));
      setBrowseAll(sameOrg);
      setBrowseLoaded(true);
    } catch (e) {
      setBrowseError("Couldn't load requests right now. Please try again.");
    } finally {
      setBrowseLoading(false);
    }
  }, [myRequest, email]);

  /* ---------------------------------------------------------------------- */
  /*  Render: auth screens                                                  */
  /* ---------------------------------------------------------------------- */

  if (stage === "email" || stage === "otp") {
    return (
      <div className="tx-app">
        <GlobalStyle />
        <div className="tx-auth-screen">
          <div className="tx-auth-hero">
            <SwapBadge a="A" b="B" size={84} />
            <h1 className="tx-h1">Mutual Transfer Exchange</h1>
            <p className="tx-sub">
              Find a colleague willing to swap postings with you — same organisation,
              matching role, opposite cities.
            </p>
          </div>

          {stage === "email" && (
            <div className="tx-card tx-auth-card">
              <Field label="Official email ID" required>
                <TextInput
                  type="email"
                  placeholder="you@yourorganisation.co.in"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && sendOtp()}
                />
              </Field>
              {authError && <Banner kind="error">{authError}</Banner>}
              <button className="tx-btn tx-btn-primary tx-btn-block" onClick={sendOtp}>
                Send verification code <ChevronRight size={16} />
              </button>
              <p className="tx-fineprint">
                <ShieldCheck size={13} /> Only official / organisational email addresses are accepted —
                this keeps the pool limited to verified employees.
              </p>
              <label className="tx-testmode">
                <input type="checkbox" checked={skipDomainCheck} onChange={(e) => setSkipDomainCheck(e.target.checked)} />
                <span>Testing mode — allow any email address (skips the official-domain check)</span>
              </label>
            </div>
          )}

          {stage === "otp" && (
            <div className="tx-card tx-auth-card">
              <p className="tx-body">Enter the 6-digit code to verify <strong>{email}</strong>.</p>
              <div className="tx-otp-preview">
                <Info size={14} />
                <span>
                  This prototype has no live email service connected, so the code that would
                  normally be emailed to you is shown here: <strong className="tx-mono">{sentOtp}</strong>
                </span>
              </div>
              <Field label="Verification code" required>
                <TextInput
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="6-digit code"
                  value={otpInput}
                  onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, ""))}
                  onKeyDown={(e) => e.key === "Enter" && verifyOtp()}
                  className="tx-mono"
                />
              </Field>
              {authError && <Banner kind="error">{authError}</Banner>}
              <button className="tx-btn tx-btn-primary tx-btn-block" onClick={verifyOtp} disabled={busy}>
                {busy ? <Loader2 size={16} className="tx-spin" /> : <>Verify & continue <ChevronRight size={16} /></>}
              </button>
              <button className="tx-btn tx-btn-ghost tx-btn-block" onClick={() => setStage("email")}>
                Use a different email
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  /* ---------------------------------------------------------------------- */
  /*  Render: main app                                                     */
  /* ---------------------------------------------------------------------- */

  return (
    <div className="tx-app">
      <GlobalStyle />
      <div className="tx-shell">
        <header className="tx-header">
          <div className="tx-header-left">
            <SwapBadge a="A" b="B" size={34} />
            <div>
              <div className="tx-header-title">Transfer Exchange</div>
              <div className="tx-header-sub tx-mono">{norm(email)}</div>
            </div>
          </div>
          <button className="tx-icon-btn" onClick={signOut} title="Sign out">
            <LogOut size={18} />
          </button>
        </header>

        <main className="tx-main">
          {tab === "myrequest" && (
            <MyRequestTab
              form={form} setField={setField} myRequest={myRequest} editing={editing}
              setEditing={setEditing} saving={saving} saveMsg={saveMsg} setSaveMsg={setSaveMsg}
              onSave={saveRequest} onDelete={deleteRequest} loadingUser={loadingUser}
            />
          )}
          {tab === "matches" && (
            <MatchesTab
              myRequest={myRequest} tolerance={tolerance} setTolerance={setTolerance}
              onSearch={runSearch} loading={matchLoading} error={matchError}
              strong={strongMatches} loose={looseMatches} searched={searched}
            />
          )}
          {tab === "browse" && (
            <BrowseTab
              myRequest={myRequest} all={browseAll} loading={browseLoading}
              error={browseError} loaded={browseLoaded} onLoad={runBrowse}
            />
          )}
        </main>

        <nav className="tx-tabbar">
          <button className={"tx-tab " + (tab === "myrequest" ? "tx-tab-active" : "")} onClick={() => setTab("myrequest")}>
            <FileText size={19} />
            <span>My Request</span>
          </button>
          <button className={"tx-tab " + (tab === "matches" ? "tx-tab-active" : "")} onClick={() => setTab("matches")}>
            <Search size={19} />
            <span>Find Match</span>
          </button>
          <button className={"tx-tab " + (tab === "browse" ? "tx-tab-active" : "")} onClick={() => setTab("browse")}>
            <List size={19} />
            <span>Browse</span>
          </button>
        </nav>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/*  My Request tab                                                        */
/* ---------------------------------------------------------------------- */

function MyRequestTab({ form, setField, myRequest, editing, setEditing, saving, saveMsg, setSaveMsg, onSave, onDelete, loadingUser }) {
  if (loadingUser) {
    return <div className="tx-empty"><Loader2 size={22} className="tx-spin" /><p>Loading your request…</p></div>;
  }

  if (myRequest && !editing) {
    return (
      <div className="tx-stack">
        {saveMsg && <Banner kind={saveMsg.kind} onClose={() => setSaveMsg(null)}>{saveMsg.text}</Banner>}
        <div className="tx-card">
          <div className="tx-summary-head">
            <SwapBadge a={myRequest.currentCity?.[0] || "?"} b={myRequest.desiredCity?.[0] || "?"} size={56} />
            <div>
              <div className="tx-h2">{myRequest.currentCity} <ArrowLeftRight size={14} className="tx-inline-icon" /> {myRequest.desiredCity}</div>
              <div className="tx-body-muted">{myRequest.organizationFinal || myRequest.organization}</div>
            </div>
          </div>
          <dl className="tx-detail-grid">
            <Detail label="Name" value={myRequest.name} icon={User} />
            <Detail label="Role / designation" value={myRequest.role} icon={Briefcase} />
            <Detail label="Grade / scale" value={myRequest.grade || "—"} icon={Briefcase} />
            <Detail label="Department" value={myRequest.department} icon={Briefcase} />
            <Detail label="Years of service" value={myRequest.seniorityYears} icon={Calendar} />
            <Detail label="Branch" value={`${myRequest.branchName} (${myRequest.branchCode || "—"})`} icon={Building2} />
            <Detail label="Branch type" value={myRequest.branchType} icon={MapPin} />
            <Detail label="Official phone" value={myRequest.officialPhone} icon={Phone} />
            <Detail label="Alternate phone" value={myRequest.altPhone || "—"} icon={Phone} />
            <Detail label="With family" value={myRequest.withFamily === "yes" ? `Yes${myRequest.dependents ? ` (${myRequest.dependents} dependents)` : ""}` : "No"} icon={Users} />
            <Detail label="Intended date" value={myRequest.transferDate} icon={Calendar} />
            <Detail label="Current manager" value={myRequest.managerName} icon={User} />
          </dl>
          <div className="tx-field">
            <span className="tx-field-label">Reason for transfer</span>
            <p className="tx-body">{myRequest.reason}</p>
          </div>
          {myRequest.notes && (
            <div className="tx-field">
              <span className="tx-field-label">Additional notes</span>
              <p className="tx-body">{myRequest.notes}</p>
            </div>
          )}
          <div className="tx-btn-row">
            <button className="tx-btn tx-btn-secondary" onClick={() => setEditing(true)}>
              <Edit3 size={15} /> Edit request
            </button>
            <button className="tx-btn tx-btn-danger" onClick={onDelete} disabled={saving}>
              <Trash2 size={15} /> Withdraw
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="tx-stack">
      {!myRequest && (
        <Banner kind="info">
          You don't have an active request yet. Fill this in once — you can edit or withdraw it any time.
        </Banner>
      )}
      {saveMsg && <Banner kind={saveMsg.kind} onClose={() => setSaveMsg(null)}>{saveMsg.text}</Banner>}

      <Section title="Your details">
        <Field label="Full name" required>
          <TextInput value={form.name} onChange={(e) => setField("name", e.target.value)} placeholder="As per official records" />
        </Field>
        <Field label="Organisation" required>
          <Select value={form.organization} onChange={(e) => setField("organization", e.target.value)}>
            <option value="">Select organisation</option>
            {ORGS.map((o) => <option key={o} value={o}>{o}</option>)}
          </Select>
        </Field>
        {form.organization === "Other" && (
          <Field label="Name your organisation" required>
            <TextInput value={form.organizationOther} onChange={(e) => setField("organizationOther", e.target.value)} />
          </Field>
        )}
        <div className="tx-row">
          <Field label="Official phone" required className="tx-col">
            <TextInput inputMode="numeric" maxLength={10} value={form.officialPhone} onChange={(e) => setField("officialPhone", e.target.value.replace(/\D/g, ""))} placeholder="10-digit mobile" />
          </Field>
          <Field label="Alternate phone" className="tx-col">
            <TextInput inputMode="numeric" maxLength={10} value={form.altPhone} onChange={(e) => setField("altPhone", e.target.value.replace(/\D/g, ""))} placeholder="Optional" />
          </Field>
        </div>
      </Section>

      <Section title="Current posting">
        <div className="tx-row">
          <Field label="Current city" required className="tx-col">
            <TextInput list="tx-cities" value={form.currentCity} onChange={(e) => setField("currentCity", e.target.value)} placeholder="e.g. Pune" />
          </Field>
          <Field label="Desired city" required className="tx-col">
            <TextInput list="tx-cities" value={form.desiredCity} onChange={(e) => setField("desiredCity", e.target.value)} placeholder="e.g. Nagpur" />
          </Field>
        </div>
        <datalist id="tx-cities">{CITIES.map((c) => <option key={c} value={c} />)}</datalist>
        <div className="tx-row">
          <Field label="Branch name" required className="tx-col">
            <TextInput value={form.branchName} onChange={(e) => setField("branchName", e.target.value)} />
          </Field>
          <Field label="Branch code / number" className="tx-col">
            <TextInput value={form.branchCode} onChange={(e) => setField("branchCode", e.target.value)} />
          </Field>
        </div>
        <Field label="Branch type" required>
          <Select value={form.branchType} onChange={(e) => setField("branchType", e.target.value)}>
            <option value="">Select branch type</option>
            {BRANCH_TYPES.map((b) => <option key={b} value={b}>{b}</option>)}
          </Select>
        </Field>
        <div className="tx-row">
          <Field label="Role / designation" required className="tx-col" hint="Used to match like-for-like roles">
            <TextInput value={form.role} onChange={(e) => setField("role", e.target.value)} placeholder="e.g. Assistant Manager" />
          </Field>
          <Field label="Grade / scale" className="tx-col">
            <TextInput value={form.grade} onChange={(e) => setField("grade", e.target.value)} placeholder="e.g. Scale II" />
          </Field>
        </div>
        <Field label="Department" required hint="Used to filter and match by function" className="tx-col">
          <TextInput list="tx-departments" value={form.department} onChange={(e) => setField("department", e.target.value)} placeholder="e.g. Credit / Loans" />
        </Field>
        <datalist id="tx-departments">{DEPARTMENTS.map((d) => <option key={d} value={d} />)}</datalist>
        <Field label="Years of service (seniority)" required hint="Used to match similar seniority">
          <TextInput inputMode="numeric" value={form.seniorityYears} onChange={(e) => setField("seniorityYears", e.target.value.replace(/[^\d.]/g, ""))} placeholder="e.g. 6" />
        </Field>
        <Field label="Current manager" required>
          <TextInput value={form.managerName} onChange={(e) => setField("managerName", e.target.value)} />
        </Field>
      </Section>

      <Section title="Transfer details">
        <Field label="Intended date of transfer" required>
          <TextInput type="date" value={form.transferDate} onChange={(e) => setField("transferDate", e.target.value)} />
        </Field>
        <Field label="Moving with family?">
          <Select value={form.withFamily} onChange={(e) => setField("withFamily", e.target.value)}>
            <option value="no">No</option>
            <option value="yes">Yes</option>
          </Select>
        </Field>
        {form.withFamily === "yes" && (
          <Field label="Number of dependents">
            <TextInput inputMode="numeric" value={form.dependents} onChange={(e) => setField("dependents", e.target.value.replace(/\D/g, ""))} />
          </Field>
        )}
        <Field label="Reason for transfer" required>
          <textarea className="tx-input tx-textarea" rows={3} value={form.reason} onChange={(e) => setField("reason", e.target.value)} placeholder="e.g. family relocation, medical, spouse's posting" />
        </Field>
        <Field label="Additional notes for a prospective match" hint="Optional — anything else that would help someone decide">
          <textarea className="tx-input tx-textarea" rows={2} value={form.notes} onChange={(e) => setField("notes", e.target.value)} />
        </Field>
      </Section>

      <label className="tx-consent">
        <input type="checkbox" checked={form.consent} onChange={(e) => setField("consent", e.target.checked)} />
        <span>I consent to my contact and posting details being visible to other verified employees whose request matches mine.</span>
      </label>

      <div className="tx-btn-row">
        {myRequest && (
          <button className="tx-btn tx-btn-ghost" onClick={() => { setEditing(false); setSaveMsg(null); }}>
            <RotateCcw size={15} /> Cancel
          </button>
        )}
        <button className="tx-btn tx-btn-primary tx-btn-grow" onClick={onSave} disabled={saving}>
          {saving ? <Loader2 size={16} className="tx-spin" /> : <><Plus size={15} /> {myRequest ? "Save changes" : "Submit request"}</>}
        </button>
      </div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div className="tx-card">
      <div className="tx-section-title">{title}</div>
      {children}
    </div>
  );
}

function Detail({ label, value, icon: Icon }) {
  return (
    <div className="tx-detail">
      <Icon size={14} className="tx-detail-icon" />
      <div>
        <dt className="tx-detail-label">{label}</dt>
        <dd className="tx-detail-value">{value || "—"}</dd>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/*  Matches tab                                                           */
/* ---------------------------------------------------------------------- */

function MatchesTab({ myRequest, tolerance, setTolerance, onSearch, loading, error, strong, loose, searched }) {
  if (!myRequest) {
    return (
      <div className="tx-empty">
        <Search size={28} />
        <p>Submit your request on the <strong>My Request</strong> tab first — matching needs your city, role and seniority.</p>
      </div>
    );
  }

  return (
    <div className="tx-stack">
      <div className="tx-card">
        <div className="tx-section-title">Your search</div>
        <p className="tx-body-muted">
          Looking for someone in <strong>{myRequest.desiredCity}</strong> who wants to move to{" "}
          <strong>{myRequest.currentCity}</strong>, same organisation, same role as <strong>{myRequest.role}</strong>.
        </p>
        <Field label={`Seniority tolerance: ±${tolerance} years`}>
          <input type="range" min="0" max="20" value={tolerance} onChange={(e) => setTolerance(e.target.value)} className="tx-slider" />
        </Field>
        <button className="tx-btn tx-btn-primary tx-btn-block" onClick={onSearch} disabled={loading}>
          {loading ? <Loader2 size={16} className="tx-spin" /> : <><Search size={15} /> Search for matches</>}
        </button>
      </div>

      {error && <Banner kind="error">{error}</Banner>}

      {searched && !loading && !error && (
        <>
          <MatchGroup title="Strong matches" subtitle="Same organisation, opposite cities, same role, similar seniority" items={strong} highlight />
          <MatchGroup title="Other city-swap matches" subtitle="Same organisation and opposite cities, but role or seniority differs" items={loose} />
        </>
      )}
    </div>
  );
}

function MatchGroup({ title, subtitle, items, highlight }) {
  return (
    <div className="tx-card">
      <div className="tx-section-title">{title}</div>
      <p className="tx-body-muted tx-mb">{subtitle}</p>
      {items.length === 0 ? (
        <div className="tx-empty tx-empty-inline">
          <Info size={16} />
          <span>No matches yet. New requests are added by employees over time — check back later.</span>
        </div>
      ) : (
        <div className="tx-stack">
          {items.map((m, i) => <MatchCard key={i} m={m} highlight={highlight} />)}
        </div>
      )}
    </div>
  );
}

function MatchCard({ m, highlight }) {
  const organization = m.organizationFinal || m.organization || "—";
  const withFamily =
    m.withFamily === "yes"
      ? `Yes${m.dependents ? ` (${m.dependents} dependents)` : ""}`
      : "No";

  return (
    <div className={"tx-match " + (highlight ? "tx-match-highlight" : "")}>

      {/* Transfer direction */}
      <div className="tx-match-route">
        {m.currentCity || "—"}
        <ArrowLeftRight size={15} className="tx-inline-icon" />
        {m.desiredCity || "—"}
      </div>

      {/* Organisation */}
      <div className="tx-body-muted">
        <strong>{organization}</strong>
      </div>

      {/* Employee details */}
      <dl className="tx-detail-grid">
        <Detail
          label="Name"
          value={m.name}
          icon={User}
        />

        <Detail
          label="Role / designation"
          value={m.role}
          icon={Briefcase}
        />

        <Detail
          label="Grade / scale"
          value={m.grade || "—"}
          icon={Briefcase}
        />

        <Detail
          label="Department"
          value={m.department}
          icon={Briefcase}
        />

        <Detail
          label="Years of service"
          value={m.seniorityYears}
          icon={Calendar}
        />

        <Detail
          label="Branch"
          value={`${m.branchName || "—"} (${m.branchCode || "—"})`}
          icon={Building2}
        />

        <Detail
          label="Branch type"
          value={m.branchType}
          icon={MapPin}
        />

        <Detail
          label="Official phone"
          value={m.officialPhone}
          icon={Phone}
        />

        <Detail
          label="Alternate phone"
          value={m.altPhone || "—"}
          icon={Phone}
        />

        <Detail
          label="With family"
          value={withFamily}
          icon={Users}
        />

        <Detail
          label="Intended date"
          value={m.transferDate}
          icon={Calendar}
        />

        <Detail
          label="Current manager"
          value={m.managerName}
          icon={User}
        />
      </dl>

      {/* Reason */}
      <div className="tx-field">
        <span className="tx-field-label">Reason for transfer</span>
        <p className="tx-body">{m.reason || "—"}</p>
      </div>

      {/* Additional notes, if present */}
      {m.notes && (
        <div className="tx-field">
          <span className="tx-field-label">Additional notes</span>
          <p className="tx-body">{m.notes}</p>
        </div>
      )}

      {/* Contact */}
      <div className="tx-match-contact">
        {m.email && (
          <a
            className="tx-btn tx-btn-secondary"
            href={`mailto:${m.email}`}
          >
            <Mail size={14} /> {m.email}
          </a>
        )}

        {m.officialPhone && (
          <a
            className="tx-btn tx-btn-secondary"
            href={`tel:${m.officialPhone}`}
          >
            <Phone size={14} /> {m.officialPhone}
          </a>
        )}
      </div>

    </div>
  );
}

/* ---------------------------------------------------------------------- */
/*  Browse tab (all requests, same org, filterable)                       */
/* ---------------------------------------------------------------------- */

function BrowseTab({ myRequest, all, loading, error, loaded, onLoad }) {
  const [filterFromCity, setFilterFromCity] = useState("all");
  const [filterToCity, setFilterToCity] = useState("all");
  const [filterGrade, setFilterGrade] = useState("all");
  const [filterDepartment, setFilterDepartment] = useState("all");

  const cityOptions = useMemo(() => {
    const set = new Set();
    all.forEach((r) => { if (r.currentCity) set.add(r.currentCity); if (r.desiredCity) set.add(r.desiredCity); });
    return Array.from(set).sort();
  }, [all]);

  const gradeOptions = useMemo(() => {
    const set = new Set();
    all.forEach((r) => { if (r.grade) set.add(r.grade); });
    return Array.from(set).sort();
  }, [all]);

  const departmentOptions = useMemo(() => {
    const set = new Set();
    all.forEach((r) => { if (r.department) set.add(r.department); });
    return Array.from(set).sort();
  }, [all]);

  const filtered = useMemo(() => {
    return all.filter((r) => {
      if (filterFromCity !== "all" && norm(r.currentCity) !== norm(filterFromCity)) return false;
      if (filterToCity !== "all" && norm(r.desiredCity) !== norm(filterToCity)) return false;
      if (filterGrade !== "all" && r.grade !== filterGrade) return false;
      if (filterDepartment !== "all" && r.department !== filterDepartment) return false;
      return true;
    });
  }, [all, filterFromCity, filterToCity, filterGrade, filterDepartment]);

  if (!myRequest) {
    return (
      <div className="tx-empty">
        <List size={28} />
        <p>Submit your request on the <strong>My Request</strong> tab first — browsing is scoped to your organisation.</p>
      </div>
    );
  }

  return (
    <div className="tx-stack">
      <div className="tx-card">
        <div className="tx-section-title">Browse open requests</div>
        <p className="tx-body-muted">
          Every active request within <strong>{myRequest.organizationFinal || myRequest.organization}</strong> —
          shown regardless of city direction. Use the filters below to narrow it down yourself.
        </p>
        <button className="tx-btn tx-btn-primary tx-btn-block" onClick={onLoad} disabled={loading}>
          {loading ? <Loader2 size={16} className="tx-spin" /> : <><List size={15} /> {loaded ? "Refresh list" : "Load requests"}</>}
        </button>
      </div>

      {error && <Banner kind="error">{error}</Banner>}

      {loaded && !loading && !error && (
        <>
          <div className="tx-card">
            <div className="tx-section-title">Filters</div>
            <div className="tx-row">
              <Field label="From city" hint="Where they're currently posted" className="tx-col">
                <Select value={filterFromCity} onChange={(e) => setFilterFromCity(e.target.value)}>
                  <option value="all">All cities</option>
                  {cityOptions.map((c) => <option key={c} value={c}>{c}</option>)}
                </Select>
              </Field>
              <Field label="To city" hint="Where they want to move" className="tx-col">
                <Select value={filterToCity} onChange={(e) => setFilterToCity(e.target.value)}>
                  <option value="all">All cities</option>
                  {cityOptions.map((c) => <option key={c} value={c}>{c}</option>)}
                </Select>
              </Field>
            </div>
            <div className="tx-row">
              <Field label="Grade / scale" className="tx-col">
                <Select value={filterGrade} onChange={(e) => setFilterGrade(e.target.value)}>
                  <option value="all">All grades</option>
                  {gradeOptions.map((g) => <option key={g} value={g}>{g}</option>)}
                </Select>
              </Field>
              <Field label="Department" className="tx-col">
                <Select value={filterDepartment} onChange={(e) => setFilterDepartment(e.target.value)}>
                  <option value="all">All departments</option>
                  {departmentOptions.map((d) => <option key={d} value={d}>{d}</option>)}
                </Select>
              </Field>
            </div>
          </div>

          <div className="tx-card">
            <div className="tx-section-title">{filtered.length} request{filtered.length === 1 ? "" : "s"}</div>
            {filtered.length === 0 ? (
              <div className="tx-empty tx-empty-inline">
                <Info size={16} />
                <span>No requests match these filters. Try widening the city, grade or department selection.</span>
              </div>
            ) : (
              <div className="tx-stack">
                {filtered.map((m, i) => <MatchCard key={i} m={m} />)}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/*  Styles                                                                 */
/* ---------------------------------------------------------------------- */

function GlobalStyle() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap');

      :root {
        --paper: #EEF0EA;
        --card: #FFFFFF;
        --ink: #172440;
        --slate: #5A6478;
        --navy: #223A6B;
        --navy-deep: #16233D;
        --marigold: #E1A339;
        --marigold-deep: #C6862A;
        --success: #2E7D5B;
        --success-bg: #E7F3ED;
        --alert: #B0472D;
        --alert-bg: #FBEAE4;
        --info-bg: #EAEEF6;
        --line: #DAD7CC;
      }

      .tx-app * { box-sizing: border-box; }
      .tx-app {
        font-family: 'Inter', sans-serif;
        color: var(--ink);
        background: var(--paper);
        min-height: 100%;
        display: flex;
        justify-content: center;
      }
      .tx-mono { font-family: 'JetBrains Mono', monospace; }

      /* Auth screens */
      .tx-auth-screen {
        width: 100%;
        max-width: 420px;
        padding: 40px 20px 28px;
        display: flex;
        flex-direction: column;
        gap: 22px;
      }
      .tx-auth-hero { text-align: center; display: flex; flex-direction: column; align-items: center; gap: 10px; }
      .tx-h1 { font-family: 'Space Grotesk', sans-serif; font-size: 24px; font-weight: 700; margin: 4px 0 0; color: var(--navy-deep); }
      .tx-sub { font-size: 13.5px; color: var(--slate); max-width: 320px; line-height: 1.5; margin: 0; }
      .tx-auth-card { display: flex; flex-direction: column; gap: 14px; }
      .tx-otp-preview {
        display: flex; gap: 8px; align-items: flex-start;
        background: var(--info-bg); border: 1px solid var(--line);
        border-radius: 10px; padding: 10px 12px; font-size: 12.5px; color: var(--navy-deep); line-height: 1.5;
      }
      .tx-fineprint { display: flex; align-items: flex-start; gap: 6px; font-size: 11.5px; color: var(--slate); line-height: 1.5; margin: 2px 0 0; }
      .tx-testmode {
        display: flex; gap: 8px; align-items: flex-start; font-size: 11.5px;
        color: var(--alert); background: var(--alert-bg); border: 1px dashed var(--alert);
        border-radius: 9px; padding: 9px 11px; line-height: 1.5; margin-top: 4px;
      }
      .tx-testmode input { margin-top: 2px; accent-color: var(--alert); }

      /* Shell */
.tx-shell {
  width: 100%; max-width: 430px;
  background: var(--paper);
  display: flex;
  flex-direction: column;
      .tx-header {
        display: flex; align-items: center; justify-content: space-between;
        padding: 14px 16px; background: var(--navy-deep); color: #fff;
        position: sticky; top: 0; z-index: 5;
      }
      .tx-header-left { display: flex; align-items: center; gap: 10px; }
      .tx-header-title { font-family: 'Space Grotesk', sans-serif; font-weight: 600; font-size: 15px; }
      .tx-header-sub { font-size: 10.5px; opacity: 0.7; }
      .tx-icon-btn { background: rgba(255,255,255,0.1); border: none; color: #fff; padding: 8px; border-radius: 8px; cursor: pointer; display: flex; }
      .tx-icon-btn:hover { background: rgba(255,255,255,0.18); }

.tx-main {
  flex: 0 0 auto;
  padding: 16px;
  padding-bottom: 24px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}      .tx-stack { display: flex; flex-direction: column; gap: 14px; }

.tx-tabbar {
  position: fixed;
  bottom: 0;
  width: 100%;
  max-width: 430px;
  display: flex;
  background: var(--card);
  border-top: 1px solid var(--line);
  padding: 6px 10px 10px;
}
      .tx-tab {
        flex: 1; display: flex; flex-direction: column; align-items: center; gap: 3px;
        background: none; border: none; color: var(--slate); font-size: 11px; padding: 6px 0;
        cursor: pointer; font-family: 'Inter', sans-serif; border-radius: 10px;
      }
      .tx-tab-active { color: var(--navy); font-weight: 600; background: var(--info-bg); }

      /* Cards & sections */
      .tx-card {
        background: var(--card); border: 1px solid var(--line); border-radius: 14px;
        padding: 16px; display: flex; flex-direction: column; gap: 12px;
      }
      .tx-section-title { font-family: 'Space Grotesk', sans-serif; font-weight: 600; font-size: 14px; color: var(--navy-deep); }
      .tx-h2 { font-family: 'Space Grotesk', sans-serif; font-weight: 600; font-size: 17px; display: flex; align-items: center; gap: 4px; }
      .tx-body { font-size: 13.5px; line-height: 1.55; margin: 0; }
      .tx-body-muted { font-size: 12.5px; color: var(--slate); line-height: 1.5; margin: 0; }
      .tx-mb { margin-bottom: 4px; }
      .tx-inline-icon { vertical-align: -2px; margin: 0 2px; color: var(--marigold-deep); }

      /* Fields */
      .tx-field { display: flex; flex-direction: column; gap: 5px; }
      .tx-field-label { font-size: 12px; font-weight: 600; color: var(--navy-deep); }
      .tx-field-hint { font-size: 11px; color: var(--slate); }
      .tx-required { color: var(--alert); margin-left: 3px; }
      .tx-input {
        font-family: 'Inter', sans-serif; font-size: 13.5px; padding: 10px 11px;
        border: 1px solid var(--line); border-radius: 9px; background: #FCFCFA; color: var(--ink);
        width: 100%;
      }
      .tx-input:focus { outline: 2px solid var(--navy); outline-offset: 1px; border-color: var(--navy); }
      .tx-select { appearance: auto; }
      .tx-textarea { resize: vertical; font-family: 'Inter', sans-serif; }
      .tx-row { display: flex; gap: 10px; }
      .tx-col { flex: 1; min-width: 0; }
      .tx-slider { width: 100%; accent-color: var(--navy); }

      .tx-consent {
        display: flex; gap: 10px; align-items: flex-start; font-size: 12.5px;
        color: var(--slate); background: var(--card); border: 1px solid var(--line);
        border-radius: 12px; padding: 12px 14px; line-height: 1.5;
      }
      .tx-consent input { margin-top: 2px; accent-color: var(--navy); }

      .tx-field-hint-inline { font-size: 10.5px; font-weight: 400; color: var(--slate); text-transform: none; letter-spacing: 0; }
      .tx-chip-row { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 4px; }
      .tx-chip {
        font-family: 'Inter', sans-serif; font-size: 12px; font-weight: 500;
        padding: 6px 12px; border-radius: 999px; border: 1px solid var(--line);
        background: #FCFCFA; color: var(--slate); cursor: pointer;
      }
      .tx-chip-active { background: var(--navy); color: #fff; border-color: var(--navy); }

      /* Buttons */
      .tx-btn {
        display: inline-flex; align-items: center; justify-content: center; gap: 6px;
        font-family: 'Inter', sans-serif; font-weight: 600; font-size: 13px;
        padding: 11px 16px; border-radius: 10px; border: 1px solid transparent;
        cursor: pointer; text-decoration: none; transition: background 0.15s;
      }
      .tx-btn-primary { background: var(--marigold); color: var(--navy-deep); }
      .tx-btn-primary:hover { background: var(--marigold-deep); }
      .tx-btn-secondary { background: var(--info-bg); color: var(--navy-deep); border-color: var(--line); }
      .tx-btn-secondary:hover { background: #DEE4EF; }
      .tx-btn-ghost { background: transparent; color: var(--slate); border-color: var(--line); }
      .tx-btn-danger { background: var(--alert-bg); color: var(--alert); }
      .tx-btn-block { width: 100%; }
      .tx-btn-grow { flex: 1; }
      .tx-btn:disabled { opacity: 0.6; cursor: not-allowed; }
      .tx-btn-row { display: flex; gap: 10px; }

      /* Summary / details */
      .tx-summary-head { display: flex; align-items: center; gap: 12px; }
      .tx-detail-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin: 0; }
      .tx-detail { display: flex; gap: 8px; align-items: flex-start; }
      .tx-detail-icon { color: var(--marigold-deep); margin-top: 2px; flex-shrink: 0; }
      .tx-detail-label { font-size: 10.5px; text-transform: uppercase; letter-spacing: 0.03em; color: var(--slate); margin: 0; }
      .tx-detail-value { font-size: 13px; font-weight: 500; margin: 1px 0 0; }

      /* Banners */
      .tx-banner {
        display: flex; align-items: flex-start; gap: 8px; padding: 10px 12px;
        border-radius: 10px; font-size: 12.5px; line-height: 1.5;
      }
      .tx-banner-info { background: var(--info-bg); color: var(--navy-deep); }
      .tx-banner-success { background: var(--success-bg); color: var(--success); }
      .tx-banner-error { background: var(--alert-bg); color: var(--alert); }
      .tx-banner-close { margin-left: auto; background: none; border: none; cursor: pointer; color: inherit; opacity: 0.7; }

      /* Empty states */
      .tx-empty {
        display: flex; flex-direction: column; align-items: center; gap: 10px;
        text-align: center; color: var(--slate); padding: 40px 20px; font-size: 13px;
      }
      .tx-empty-inline { flex-direction: row; padding: 12px; background: var(--paper); border-radius: 10px; text-align: left; }

      /* Match cards */
      .tx-match { border: 1px solid var(--line); border-radius: 12px; padding: 14px; display: flex; flex-direction: column; gap: 10px; }
      .tx-match-highlight { border-color: var(--marigold); box-shadow: 0 0 0 1px var(--marigold); }
      .tx-match-head { display: flex; align-items: center; gap: 10px; }
      .tx-match-name { font-weight: 600; font-size: 14px; }
      .tx-match-route { font-family: 'Space Grotesk', sans-serif; font-weight: 600; font-size: 13px; color: var(--navy); display: flex; align-items: center; }
      .tx-match-contact { display: flex; gap: 8px; flex-wrap: wrap; }

      .tx-badge-letter { font-family: 'Space Grotesk', sans-serif; font-weight: 700; font-size: 22px; fill: #fff; }
      .tx-badge-letter-dark { fill: var(--navy-deep); }

      .tx-spin { animation: tx-spin 0.8s linear infinite; }
      @keyframes tx-spin { to { transform: rotate(360deg); } }

      @media (max-width: 460px) {
        .tx-row { flex-direction: column; }
        .tx-detail-grid { grid-template-columns: 1fr; }
      }
    `}</style>
  );
}
