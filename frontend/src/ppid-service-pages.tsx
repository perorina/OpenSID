import { FormEvent, ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  BarChart3,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  CircleAlert,
  Clock3,
  Download,
  ExternalLink,
  FileSearch,
  FileText,
  History,
  LifeBuoy,
  Loader2,
  LogIn,
  LogOut,
  MapPin,
  PhoneCall,
  Save,
  ShieldCheck,
} from "lucide-react";
import { loginAdmin, logoutAdmin, restoreAdminSession } from "./admin-auth";
import { apiGet, apiPost } from "./api";
import type {
  AdminPPIDServices,
  AdminUser,
  BudgetData,
  Emergency,
  EmergencyData,
  InformationObjection,
  InformationRequest,
  PPIDReport,
  PublicationCatalog,
  TrackingCredential,
} from "./api";

export function PublicationDocuments({ catalog, types, empty = "Dokumen belum tersedia." }: { catalog?: PublicationCatalog; types: string[]; empty?: string }) {
  const documents = catalog?.documents.filter((item) => types.includes(item.publicationType)) ?? [];
  if (!documents.length) return <EmptyState text={empty} />;
  return (
    <div className="space-y-3">
      {catalog?.isSample ? <Notice tone="sample">Dokumen bertanda Contoh belum ditetapkan sebagai dokumen resmi.</Notice> : null}
      {documents.map((item) => (
        <article className="civic-card p-4" key={item.documentId}>
          <div className="flex items-start gap-3">
            <span className="civic-icon-box h-11 w-11"><FileText size={21} /></span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap gap-2"><span className="rounded-full bg-village-100 px-2 py-1 text-[11px] font-semibold text-village-800">{item.category.label}</span>{item.isSample ? <span className="rounded-full bg-civic-warning-bg px-2 py-1 text-[11px] font-semibold text-civic-warning-ink">Contoh</span> : null}</div>
              <h3 className="mt-2 text-[15px] font-semibold leading-[22px]">{item.title}</h3>
              <p className="mt-2 text-sm leading-[22px] text-civic-muted">{item.summary}</p>
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between border-t border-civic-border-soft pt-3 text-xs text-civic-muted"><span>{item.controllingUnit}</span><span>{item.format}</span></div>
          <a className="mt-3 inline-flex min-h-11 w-full items-center justify-between rounded-civic-sm bg-civic-soft px-3 text-sm font-semibold text-village-800" href={`/dip/${item.documentId}`}>Lihat detail <ChevronRight size={17} /></a>
        </article>
      ))}
    </div>
  );
}

export function PublicationCoveragePanel({ catalog }: { catalog?: PublicationCatalog }) {
  if (!catalog) return <EmptyState text="Status publikasi belum tersedia." />;
  return (
    <section className="civic-card p-4">
      <div className="flex items-end justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[0.1em] text-village-700">Kelengkapan</p><h3 className="mt-1 text-[22px] font-bold leading-[30px]">{catalog.completeness}% tersedia</h3></div><p className="text-sm font-semibold text-civic-muted">{catalog.completed}/{catalog.required}</p></div>
      <div className="mt-4 h-2 overflow-hidden rounded-full bg-civic-border"><div className="h-full rounded-full bg-village-700" style={{ width: `${catalog.completeness}%` }} /></div>
      <div className="mt-4 divide-y divide-civic-border-soft">
        {catalog.coverage.map((item) => <div className="flex min-h-11 items-center justify-between gap-3 py-2 text-sm" key={item.key}><span className="font-medium">{item.label}</span><span className={`font-semibold ${item.available ? "text-village-700" : "text-civic-warning"}`}>{item.available ? `${item.available} dokumen` : "Belum ada"}</span></div>)}
      </div>
    </section>
  );
}

export function BudgetSummary({ budget }: { budget?: BudgetData }) {
  if (!budget) return <EmptyState text="Data anggaran belum tersedia." />;
  const percent = budget.totalAnggaran > 0 ? Math.min(100, Math.round(budget.totalRealisasi / budget.totalAnggaran * 100)) : 0;
  return (
    <section className="civic-card p-4">
      <div className="grid grid-cols-2 gap-3"><Metric label={`Anggaran ${budget.year}`} value={formatRupiah(budget.totalAnggaran)} /><Metric label="Realisasi" value={formatRupiah(budget.totalRealisasi)} /></div>
      <div className="mt-4 flex items-center justify-between text-sm"><span className="font-semibold">Capaian realisasi</span><span className="font-bold text-village-800">{percent}%</span></div>
      <div className="mt-2 h-2 rounded-full bg-civic-border"><div className="h-full rounded-full bg-village-700" style={{ width: `${percent}%` }} /></div>
    </section>
  );
}

export function InformationRequestPage() {
  const [form, setForm] = useState({ applicantName: "", identityType: "nik", identityNumber: "", email: "", phone: "", address: "", informationRequested: "", purpose: "", deliveryMethod: "digital" });
  const [credential, setCredential] = useState<TrackingCredential | null>(null);
  const [track, setTrack] = useState({ ticketCode: "", trackingToken: "" });
  const [result, setResult] = useState<{ request: InformationRequest; objections: InformationObjection[] } | null>(null);
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setLoading("submit"); setError(null);
    try {
      const created = await apiPost<TrackingCredential>("/public/ppid/requests", form, false);
      setCredential(created); setTrack({ ticketCode: created.ticketCode, trackingToken: created.trackingToken });
      window.localStorage.setItem("yms_ppid_tracking", JSON.stringify({ ticketCode: created.ticketCode, trackingToken: created.trackingToken }));
    } catch (submitError) { setError(messageOf(submitError, "Permohonan belum bisa dikirim.")); } finally { setLoading(null); }
  }

  async function trackRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setLoading("track"); setError(null);
    try { setResult(await apiPost("/public/ppid/requests/track", track, false)); } catch (trackError) { setError(messageOf(trackError, "Permohonan tidak ditemukan.")); } finally { setLoading(null); }
  }

  return (
    <div className="space-y-4">
      {credential ? <CredentialCard credential={credential} title="Permohonan tercatat" /> : (
        <form className="civic-card space-y-4 p-4" onSubmit={submit}>
          <h3 className="text-lg font-bold">Form permohonan informasi</h3>
          <TextField label="Nama pemohon" value={form.applicantName} onChange={(value) => setForm({ ...form, applicantName: value })} required />
          <div className="grid grid-cols-[112px_1fr] gap-3"><SelectField label="Identitas" value={form.identityType} onChange={(value) => setForm({ ...form, identityType: value })} options={[['nik','NIK'],['passport','Paspor'],['other','Lainnya']]} /><TextField label="Nomor identitas" value={form.identityNumber} onChange={(value) => setForm({ ...form, identityNumber: value })} required /></div>
          <div className="grid grid-cols-2 gap-3"><TextField label="Telepon" type="tel" value={form.phone} onChange={(value) => setForm({ ...form, phone: value })} required /><TextField label="Email" type="email" value={form.email} onChange={(value) => setForm({ ...form, email: value })} /></div>
          <TextArea label="Alamat" value={form.address} onChange={(value) => setForm({ ...form, address: value })} required />
          <TextArea label="Informasi yang diminta" value={form.informationRequested} onChange={(value) => setForm({ ...form, informationRequested: value })} required />
          <TextArea label="Tujuan penggunaan" value={form.purpose} onChange={(value) => setForm({ ...form, purpose: value })} required />
          <SelectField label="Cara menerima informasi" value={form.deliveryMethod} onChange={(value) => setForm({ ...form, deliveryMethod: value })} options={[['digital','Tautan digital'],['email','Email'],['pickup','Ambil di kantor desa']]} />
          {error ? <Notice tone="error">{error}</Notice> : null}
          <PrimaryButton loading={loading === "submit"}>Kirim permohonan</PrimaryButton>
        </form>
      )}
      <TrackingPanel loading={loading === "track"} onSubmit={trackRequest} setTrack={setTrack} track={track} />
      {result ? <RequestTrackingResult data={result} /> : null}
    </div>
  );
}

function TrackingPanel({ loading, onSubmit, setTrack, track }: { loading: boolean; onSubmit: (event: FormEvent<HTMLFormElement>) => void; setTrack: (value: { ticketCode: string; trackingToken: string }) => void; track: { ticketCode: string; trackingToken: string } }) {
  return <form className="civic-card space-y-3 p-4" onSubmit={onSubmit}><div className="flex items-center gap-3"><span className="civic-icon-box h-11 w-11"><FileSearch size={21} /></span><h3 className="text-lg font-bold">Lacak permohonan</h3></div><TextField label="Nomor registrasi" value={track.ticketCode} onChange={(value) => setTrack({ ...track, ticketCode: value })} required /><TextField label="Token pelacakan" value={track.trackingToken} onChange={(value) => setTrack({ ...track, trackingToken: value })} required /><PrimaryButton loading={loading}>Lacak status</PrimaryButton></form>;
}

function RequestTrackingResult({ data }: { data: { request: InformationRequest; objections: InformationObjection[] } }) {
  const item = data.request;
  return <section className="civic-card p-4"><StatusHeader label={item.statusLabel} overdue={item.isOverdue} sample={item.isSample} /><h3 className="mt-3 text-lg font-bold">{item.ticketCode}</h3><p className="mt-2 text-sm leading-[22px] text-civic-muted">{item.informationRequested}</p><div className="mt-4 grid grid-cols-2 gap-3"><Meta label="Diterima" value={formatDate(item.createdAt)} /><Meta label="Tenggat" value={formatDate(item.extendedDueAt || item.dueAt)} /></div>{item.responseSummary ? <ResponseBox title="Jawaban PPID" text={item.responseSummary} /> : null}{item.rejectionReason ? <ResponseBox title="Alasan penolakan" text={item.rejectionReason} /> : null}{item.responseDocumentUrl ? <a className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-civic-sm bg-village-800 text-sm font-semibold text-white" href={item.responseDocumentUrl} target="_blank" rel="noreferrer"><ExternalLink size={17} /> Buka dokumen jawaban</a> : null}{data.objections.length ? <div className="mt-4 border-t border-civic-border-soft pt-4"><p className="text-sm font-bold">Keberatan terkait</p>{data.objections.map((objection) => <p className="mt-2 text-sm text-civic-muted" key={objection.id}>{objection.ticketCode} - {objection.statusLabel}</p>)}</div> : null}</section>;
}

export function InformationObjectionPage() {
  const [form, setForm] = useState({ requestTicket: "", requestToken: "", applicantName: "", email: "", phone: "", reasonCode: "late_response", detail: "" });
  const [track, setTrack] = useState({ ticketCode: "", trackingToken: "" });
  const [credential, setCredential] = useState<TrackingCredential | null>(null);
  const [result, setResult] = useState<InformationObjection | null>(null);
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  async function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); setLoading("submit"); setError(null); try { const created=await apiPost<TrackingCredential>("/public/ppid/objections",form,false); setCredential(created); setTrack({ticketCode:created.ticketCode,trackingToken:created.trackingToken}); } catch(e){setError(messageOf(e,"Keberatan belum bisa dikirim."));} finally{setLoading(null)} }
  async function trackObjection(event: FormEvent<HTMLFormElement>) { event.preventDefault(); setLoading("track"); setError(null); try{setResult(await apiPost("/public/ppid/objections/track",track,false));}catch(e){setError(messageOf(e,"Keberatan tidak ditemukan."));}finally{setLoading(null)} }
  return <div className="space-y-4">{credential?<CredentialCard credential={credential} title="Keberatan tercatat"/>:<form className="civic-card space-y-4 p-4" onSubmit={submit}><h3 className="text-lg font-bold">Form keberatan informasi</h3><Notice tone="info">Isi nomor permohonan dan token bila keberatan terkait permohonan sebelumnya.</Notice><div className="grid grid-cols-2 gap-3"><TextField label="Nomor permohonan" value={form.requestTicket} onChange={(v)=>setForm({...form,requestTicket:v})}/><TextField label="Token permohonan" value={form.requestToken} onChange={(v)=>setForm({...form,requestToken:v})}/></div><TextField label="Nama pemohon" value={form.applicantName} onChange={(v)=>setForm({...form,applicantName:v})}/><div className="grid grid-cols-2 gap-3"><TextField label="Telepon" type="tel" value={form.phone} onChange={(v)=>setForm({...form,phone:v})}/><TextField label="Email" type="email" value={form.email} onChange={(v)=>setForm({...form,email:v})}/></div><SelectField label="Alasan keberatan" value={form.reasonCode} onChange={(v)=>setForm({...form,reasonCode:v})} options={objectionReasons}/><TextArea label="Uraian keberatan" value={form.detail} onChange={(v)=>setForm({...form,detail:v})} required/>{error?<Notice tone="error">{error}</Notice>:null}<PrimaryButton loading={loading==="submit"}>Kirim keberatan</PrimaryButton></form>}<form className="civic-card space-y-3 p-4" onSubmit={trackObjection}><h3 className="text-lg font-bold">Lacak keberatan</h3><TextField label="Nomor keberatan" value={track.ticketCode} onChange={(v)=>setTrack({...track,ticketCode:v})} required/><TextField label="Token pelacakan" value={track.trackingToken} onChange={(v)=>setTrack({...track,trackingToken:v})} required/><PrimaryButton loading={loading==="track"}>Lacak status</PrimaryButton></form>{result?<section className="civic-card p-4"><StatusHeader label={result.statusLabel} overdue={result.isOverdue} sample={result.isSample}/><h3 className="mt-3 text-lg font-bold">{result.ticketCode}</h3><p className="mt-2 text-sm leading-[22px] text-civic-muted">{result.reasonLabel}: {result.detail}</p><Meta label="Tenggat tanggapan" value={formatDate(result.dueAt)}/>{result.response?<ResponseBox title="Tanggapan Atasan PPID" text={result.response}/>:null}</section>:null}</div>;
}

export function PPIDReportPage({ report }: { report?: PPIDReport }) {
  if (!report) return <EmptyState text="Laporan layanan belum tersedia." />;
  const months = ["Jan","Feb","Mar","Apr","Mei","Jun","Jul","Agu","Sep","Okt","Nov","Des"];
  const maxValue = Math.max(1, ...report.monthlyRequests);
  return <div className="space-y-4"><div className="grid grid-cols-2 gap-3"><Metric label="Permohonan" value={String(report.requestsTotal)}/><Metric label="Keberatan" value={String(report.objectionsTotal)}/><Metric label="Rata-rata selesai" value={`${report.averageResponseDays.toFixed(1)} hari`}/><Metric label="DIP terbit" value={String(report.dipPublished)}/></div><section className="civic-card p-4"><div className="flex items-center gap-3"><span className="civic-icon-box h-11 w-11"><BarChart3 size={21}/></span><div><p className="text-xs font-semibold text-village-700">Tahun {report.year}</p><h3 className="text-lg font-bold">Permohonan per bulan</h3></div></div><div className="mt-5 grid grid-cols-12 items-end gap-1" aria-label="Grafik permohonan bulanan">{report.monthlyRequests.map((value,index)=><div className="text-center" key={months[index]}><div className="mx-auto w-full max-w-4 rounded-t bg-village-700" style={{height:`${Math.max(4,value/maxValue*72)}px`}} title={`${months[index]}: ${value}`}/><span className="mt-2 block text-[10px] text-civic-muted">{months[index]}</span></div>)}</div></section><section className="civic-card divide-y divide-civic-border-soft px-4"><ReportRow label="Permohonan lewat tenggat" value={report.overdueRequests}/><ReportRow label="Keberatan lewat tenggat" value={report.overdueObjections}/><ReportRow label="Informasi darurat" value={report.emergencies}/><ReportRow label="Total versi DIP" value={report.dipVersionTotal}/></section></div>;
}

export function EmergencyPublicPage({ data }: { data?: EmergencyData }) {
  if (!data) return <EmptyState text="Informasi darurat belum tersedia." />;
  const active = data.items.filter((item)=>item.status==="published");
  const resolved = data.items.filter((item)=>item.status==="resolved");
  return <div className="space-y-4">{data.isSample?<Notice tone="sample">Informasi bertanda Contoh adalah simulasi dan bukan peringatan darurat nyata.</Notice>:null}{active.length?active.map((item)=><EmergencyCard item={item} key={item.id}/>):<Notice tone="success">Tidak ada informasi darurat aktif.</Notice>}<section className="civic-card p-4"><h3 className="text-lg font-bold">Kontak bantuan</h3><div className="mt-3 divide-y divide-civic-border-soft">{data.contacts.map((item)=><a className="flex min-h-14 items-center gap-3 py-2" href={`tel:${item.value}`} key={item.id}><span className="civic-icon-box h-10 w-10"><PhoneCall size={19}/></span><span className="min-w-0 flex-1"><span className="block text-sm font-semibold">{item.label}</span><span className="block text-xs text-civic-muted">{item.description}</span></span><span className="text-sm font-bold text-village-800">{item.value}</span></a>)}</div></section>{resolved.length?<section className="space-y-3"><h3 className="text-lg font-bold">Informasi selesai</h3>{resolved.map((item)=><EmergencyCard item={item} key={item.id}/>)}</section>:null}</div>;
}

function EmergencyCard({item}:{item:Emergency}){const tone=item.severity==="critical"?"border-civic-danger/30 bg-civic-danger-bg":item.severity==="warning"?"border-civic-warning/30 bg-civic-warning-bg":"border-village-100 bg-village-50";return <article className={`rounded-civic-lg border p-4 ${tone}`}><div className="flex items-start gap-3"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-civic-md bg-white/80 text-civic-warning-ink">{item.severity==="critical"?<AlertTriangle size={22}/>:<CircleAlert size={22}/>}</span><div><div className="flex flex-wrap gap-2"><span className="rounded-full bg-white/80 px-2 py-1 text-[11px] font-semibold">{item.statusLabel}</span>{item.isSample?<span className="rounded-full bg-white/80 px-2 py-1 text-[11px] font-semibold">Contoh</span>:null}</div><h3 className="mt-2 text-lg font-bold leading-6">{item.title}</h3><p className="mt-1 flex items-center gap-1 text-xs text-civic-muted"><MapPin size={13}/>{item.location} - {formatDate(item.occurredAt)}</p></div></div><p className="mt-4 text-sm leading-[22px]">{item.instructions}</p><div className="mt-4 grid gap-2 text-sm"><Meta label="Wilayah terdampak" value={item.affectedArea}/>{item.safePlace?<Meta label="Tempat aman" value={item.safePlace}/>:null}{item.evacuationRoute?<Meta label="Jalur evakuasi" value={item.evacuationRoute}/>:null}{item.aidChannel?<Meta label="Kanal bantuan" value={item.aidChannel}/>:null}{item.actionTaken?<Meta label="Tindakan desa" value={item.actionTaken}/>:null}</div>{item.contactPhone?<a className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-civic-sm bg-village-800 text-sm font-semibold text-white" href={`tel:${item.contactPhone}`}><PhoneCall size={17}/>{item.contactName||"Hubungi petugas"}</a>:null}</article>}

type AdminTab = "requests"|"objections"|"emergencies"|"report"|"audit";

export function PPIDServicesAdminPage({villageName}:{villageName:string}){
  const [admin,setAdmin]=useState<AdminUser|null>(null);const [checked,setChecked]=useState(false);const [data,setData]=useState<AdminPPIDServices|null>(null);const [tab,setTab]=useState<AdminTab>("requests");const [login,setLogin]=useState({username:"admin",password:""});const [loading,setLoading]=useState(false);const [error,setError]=useState<string|null>(null);const [message,setMessage]=useState<string|null>(null);
  const load=useCallback(async()=>{setLoading(true);try{setData(await apiGet("/admin/ppid/services"));setError(null)}catch(e){setError(messageOf(e,"Data layanan PPID belum bisa dimuat."))}finally{setLoading(false)}},[]);
  useEffect(()=>{let active=true;restoreAdminSession().then(async(user)=>{if(!active)return;setAdmin(user);await load()}).catch(()=>active&&setAdmin(null)).finally(()=>active&&setChecked(true));return()=>{active=false}},[load]);
  async function doLogin(event:FormEvent<HTMLFormElement>){event.preventDefault();setLoading(true);try{setAdmin(await loginAdmin(login));await load()}catch(e){setError(messageOf(e,"Login admin gagal."))}finally{setLoading(false)}}
  async function doLogout(){try{await logoutAdmin()}catch{}setAdmin(null);setData(null)}
  async function seed(){setLoading(true);try{await apiPost("/admin/ppid/seed-workflow",{});setMessage("Data contoh layanan PPID siap.");await load()}catch(e){setError(messageOf(e,"Data contoh belum bisa dibuat."))}finally{setLoading(false)}}
  const shell=(children:ReactNode)=><main className="min-h-screen bg-cream-50 text-civic-text md:py-6"><section className="mx-auto min-h-screen w-full max-w-[430px] bg-cream-50 px-4 pb-10 pt-5 md:rounded-civic-xl md:border md:border-civic-border md:shadow-civic-md"><header className="flex items-center gap-3"><a className="grid h-11 w-11 place-items-center rounded-civic-md border border-civic-border bg-white" href="/ppid" aria-label="Kembali ke PPID"><ArrowLeft size={20}/></a><div className="min-w-0 flex-1"><p className="text-xs font-semibold text-village-700">Desa {villageName}</p><h1 className="text-xl font-bold">Layanan PPID</h1></div>{admin?<button className="grid h-11 w-11 place-items-center rounded-civic-md border border-civic-border bg-white" onClick={doLogout} aria-label="Keluar"><LogOut size={19}/></button>:null}</header>{children}</section></main>;
  if(!checked)return shell(<LoadingBlock/>);if(!admin)return shell(<form className="civic-card mt-8 space-y-4 p-5" onSubmit={doLogin}><span className="civic-icon-box"><ShieldCheck size={24}/></span><h2 className="text-[22px] font-bold">Masuk pengelola layanan</h2><TextField label="Username" value={login.username} onChange={(v)=>setLogin({...login,username:v})} required/><TextField label="Password" type="password" value={login.password} onChange={(v)=>setLogin({...login,password:v})} required/>{error?<Notice tone="error">{error}</Notice>:null}<PrimaryButton loading={loading}><LogIn size={17}/> Masuk</PrimaryButton></form>);
  return shell(<><div className="mt-5 grid grid-cols-3 gap-2"><Metric label="Lewat SLA" value={String((data?.sla.requestsOverdue??0)+(data?.sla.objectionsOverdue??0))}/><Metric label="Jatuh tempo" value={String(data?.sla.dueSoon??0)}/><Metric label="DIP" value={String(data?.report.dipPublished??0)}/></div>{message?<Notice tone="success">{message}</Notice>:null}{error?<Notice tone="error">{error}</Notice>:null}<div className="-mx-4 mt-5 flex gap-2 overflow-x-auto px-4 pb-1 scrollbar-hide">{([['requests','Permohonan'],['objections','Keberatan'],['emergencies','Darurat'],['report','Laporan'],['audit','Audit']] as Array<[AdminTab,string]>).map(([key,label])=><button className={`min-h-11 shrink-0 rounded-full px-3 text-xs font-semibold ${tab===key?"bg-village-800 text-white":"border border-civic-border bg-white"}`} onClick={()=>setTab(key)} key={key}>{label}</button>)}</div>{data?.sampleAvailable?<button className="mt-4 h-11 rounded-civic-sm border border-civic-border bg-white px-3 text-sm font-semibold" disabled={loading||!data.canEdit} onClick={()=>void seed()}>Isi data contoh</button>:null}{loading&&!data?<LoadingBlock/>:null}{data&&tab==="requests"?<div className="mt-4 space-y-3">{data.requests.map((item)=><AdminRequestCard item={item} canEdit={data.canEdit} onSaved={load} key={item.id}/>)}</div>:null}{data&&tab==="objections"?<div className="mt-4 space-y-3">{data.objections.map((item)=><AdminObjectionCard item={item} canEdit={data.canEdit} onSaved={load} key={item.id}/>)}</div>:null}{data&&tab==="emergencies"?<AdminEmergencyPanel data={data} onSaved={load}/>:null}{data&&tab==="report"?<div className="mt-4"><PPIDReportPage report={data.report}/><a className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-civic-sm bg-village-800 text-sm font-semibold text-white" href={`/_bff/admin/ppid/report.csv?year=${data.report.year}`}><Download size={17}/> Unduh laporan CSV</a></div>:null}{data&&tab==="audit"?<div className="mt-4 space-y-3">{data.audit.map((item)=><article className="civic-card p-4" key={item.id}><div className="flex items-center gap-2"><History size={17} className="text-village-700"/><span className="text-xs font-semibold text-civic-muted">{formatDate(item.createdAt)}</span></div><p className="mt-2 text-sm font-semibold">{item.actor} - {auditLabel(item.action)}</p><p className="mt-1 text-xs text-civic-muted">{item.entityType} #{item.entityId}</p></article>)}</div>:null}</>);
}

function AdminRequestCard({item,canEdit,onSaved}:{item:InformationRequest;canEdit:boolean;onSaved:()=>Promise<void>}){const choices=requestTransitions[item.status]??[];const [status,setStatus]=useState(choices[0]??"");const [response,setResponse]=useState(item.responseSummary??"");const [rejection,setRejection]=useState(item.rejectionReason??"");const [documentId,setDocumentId]=useState(item.responseDocumentId?String(item.responseDocumentId):"");const [loading,setLoading]=useState(false);async function save(){if(!status)return;setLoading(true);try{await apiPost(`/admin/ppid/requests/${item.id}`,{status,responseSummary:response,rejectionReason:rejection,responseDocumentId:Number(documentId)||0});await onSaved()}finally{setLoading(false)}}return <article className="civic-card p-4"><StatusHeader label={item.statusLabel} overdue={item.isOverdue} sample={item.isSample}/><h3 className="mt-3 text-[15px] font-semibold">{item.ticketCode} - {item.applicantName}</h3><p className="mt-2 text-sm leading-[22px] text-civic-muted">{item.informationRequested}</p><div className="mt-3 grid grid-cols-2 gap-2"><Meta label="Tenggat" value={formatDate(item.extendedDueAt||item.dueAt)}/><Meta label="Kontak" value={item.phone}/></div>{choices.length&&canEdit?<div className="mt-4 space-y-3 border-t border-civic-border-soft pt-4"><SelectField label="Status berikutnya" value={status} onChange={setStatus} options={choices.map((value)=>[value,statusLabels[value]||value])}/>{status==="fulfilled"?<><TextArea label="Ringkasan jawaban" value={response} onChange={setResponse}/><TextField label="ID dokumen DIP" type="number" value={documentId} onChange={setDocumentId}/></>:null}{status==="rejected"?<TextArea label="Alasan penolakan" value={rejection} onChange={setRejection}/>:null}<button className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-civic-sm bg-village-800 text-sm font-semibold text-white disabled:opacity-60" disabled={loading} onClick={()=>void save()}><Save size={17}/> Simpan status</button></div>:null}</article>}

function AdminObjectionCard({item,canEdit,onSaved}:{item:InformationObjection;canEdit:boolean;onSaved:()=>Promise<void>}){const choices=objectionTransitions[item.status]??[];const [status,setStatus]=useState(choices[0]??"");const [response,setResponse]=useState(item.response??"");const [loading,setLoading]=useState(false);async function save(){if(!status)return;setLoading(true);try{await apiPost(`/admin/ppid/objections/${item.id}`,{status,response});await onSaved()}finally{setLoading(false)}}return <article className="civic-card p-4"><StatusHeader label={item.statusLabel} overdue={item.isOverdue} sample={item.isSample}/><h3 className="mt-3 text-[15px] font-semibold">{item.ticketCode} - {item.applicantName}</h3><p className="mt-2 text-sm leading-[22px] text-civic-muted">{item.reasonLabel}: {item.detail}</p><Meta label="Tenggat" value={formatDate(item.dueAt)}/>{choices.length&&canEdit?<div className="mt-4 space-y-3 border-t border-civic-border-soft pt-4"><SelectField label="Status berikutnya" value={status} onChange={setStatus} options={choices.map((value)=>[value,statusLabels[value]||value])}/>{status!=="review"?<TextArea label="Tanggapan Atasan PPID" value={response} onChange={setResponse}/>:null}<button className="h-11 w-full rounded-civic-sm bg-village-800 text-sm font-semibold text-white disabled:opacity-60" disabled={loading} onClick={()=>void save()}>Simpan tanggapan</button></div>:null}</article>}

function AdminEmergencyPanel({data,onSaved}:{data:AdminPPIDServices;onSaved:()=>Promise<void>}){const initial={id:0,title:"",severity:"warning",status:"draft",occurredAt:new Date().toISOString().slice(0,16),location:"",affectedArea:"",instructions:"",evacuationRoute:"",safePlace:"",aidChannel:"",actionTaken:"",contactName:"",contactPhone:"",statusLabel:"",updatedAt:"",isSample:false} as Emergency;const [form,setForm]=useState<Emergency>(initial);const [loading,setLoading]=useState(false);function edit(item:Emergency){setForm({...item,occurredAt:item.occurredAt.replace(" ","T").slice(0,16)})}async function save(event:FormEvent<HTMLFormElement>){event.preventDefault();setLoading(true);try{await apiPost(form.id?`/admin/ppid/emergencies/${form.id}`:"/admin/ppid/emergencies",form);setForm(initial);await onSaved()}finally{setLoading(false)}}return <div className="mt-4 space-y-4"><form className="civic-card space-y-3 p-4" onSubmit={save}><h3 className="text-lg font-bold">{form.id?"Edit informasi darurat":"Informasi darurat baru"}</h3><TextField label="Judul" value={form.title} onChange={(v)=>setForm({...form,title:v})} required/><div className="grid grid-cols-2 gap-3"><SelectField label="Tingkat" value={form.severity} onChange={(v)=>setForm({...form,severity:v as Emergency['severity']})} options={[["info","Informasi"],["warning","Waspada"],["critical","Kritis"]]}/><SelectField label="Status" value={form.status} onChange={(v)=>setForm({...form,status:v as Emergency['status']})} options={[["draft","Draft"],["published","Terbit"],["resolved","Selesai"]]}/></div><TextField label="Waktu kejadian" type="datetime-local" value={form.occurredAt} onChange={(v)=>setForm({...form,occurredAt:v})} required/><TextField label="Lokasi" value={form.location} onChange={(v)=>setForm({...form,location:v})} required/><TextArea label="Wilayah/pihak terdampak" value={form.affectedArea} onChange={(v)=>setForm({...form,affectedArea:v})} required/><TextArea label="Instruksi warga" value={form.instructions} onChange={(v)=>setForm({...form,instructions:v})} required/><TextArea label="Jalur evakuasi" value={form.evacuationRoute||""} onChange={(v)=>setForm({...form,evacuationRoute:v})}/><TextField label="Tempat aman" value={form.safePlace||""} onChange={(v)=>setForm({...form,safePlace:v})}/><TextArea label="Kanal bantuan" value={form.aidChannel||""} onChange={(v)=>setForm({...form,aidChannel:v})}/><TextArea label="Tindakan pemerintah desa" value={form.actionTaken||""} onChange={(v)=>setForm({...form,actionTaken:v})}/><div className="grid grid-cols-2 gap-3"><TextField label="Nama kontak" value={form.contactName||""} onChange={(v)=>setForm({...form,contactName:v})}/><TextField label="Nomor kontak" value={form.contactPhone||""} onChange={(v)=>setForm({...form,contactPhone:v})}/></div><PrimaryButton loading={loading}>Simpan informasi</PrimaryButton></form>{data.emergencies.map((item)=><article className="civic-card p-4" key={item.id}><StatusHeader label={item.statusLabel} overdue={false} sample={item.isSample}/><h3 className="mt-2 text-[15px] font-semibold">{item.title}</h3><p className="mt-1 text-xs text-civic-muted">{item.location} - {formatDate(item.occurredAt)}</p><button className="mt-3 h-11 w-full rounded-civic-sm bg-civic-soft text-sm font-semibold text-village-800" disabled={!data.canEdit} onClick={()=>edit(item)}>Kelola</button></article>)}</div>}

function CredentialCard({credential,title}:{credential:TrackingCredential;title:string}){return <section className="civic-card border-village-100 bg-village-50 p-4"><CheckCircle2 className="text-village-700" size={28}/><h3 className="mt-3 text-lg font-bold">{title}</h3><p className="mt-3 text-xs font-semibold text-civic-muted">Nomor registrasi</p><p className="mt-1 break-all text-lg font-bold text-village-800">{credential.ticketCode}</p><p className="mt-3 text-xs font-semibold text-civic-muted">Token pelacakan</p><p className="mt-1 break-all rounded-civic-sm bg-white p-3 font-mono text-xs">{credential.trackingToken}</p><p className="mt-3 text-xs leading-[18px] text-civic-muted">Simpan nomor dan token ini. Token tidak ditampilkan kembali.</p></section>}
function StatusHeader({label,overdue,sample}:{label:string;overdue:boolean;sample:boolean}){return <div className="flex flex-wrap gap-2"><span className="rounded-full bg-village-100 px-2 py-1 text-[11px] font-semibold text-village-800">{label}</span>{overdue?<span className="rounded-full bg-civic-danger-bg px-2 py-1 text-[11px] font-semibold text-civic-danger">Lewat tenggat</span>:null}{sample?<span className="rounded-full bg-civic-warning-bg px-2 py-1 text-[11px] font-semibold text-civic-warning-ink">Contoh</span>:null}</div>}
function ResponseBox({title,text}:{title:string;text:string}){return <div className="mt-4 rounded-civic-sm bg-village-50 p-3"><p className="text-xs font-bold text-village-800">{title}</p><p className="mt-1 text-sm leading-[22px]">{text}</p></div>}
function Metric({label,value}:{label:string;value:string}){return <div className="civic-card p-4"><p className="text-xl font-bold text-village-800">{value}</p><p className="mt-1 text-xs leading-[18px] text-civic-muted">{label}</p></div>}
function Meta({label,value}:{label:string;value:string}){return <p className="text-xs leading-[18px] text-civic-muted"><span className="block font-semibold text-civic-text">{label}</span>{value||"-"}</p>}
function ReportRow({label,value}:{label:string;value:number}){return <div className="flex min-h-12 items-center justify-between py-2 text-sm"><span className="font-medium">{label}</span><span className="font-bold text-village-800">{value}</span></div>}
function TextField({label,onChange,required=false,type="text",value}:{label:string;onChange:(value:string)=>void;required?:boolean;type?:string;value:string}){return <label className="block text-sm font-semibold">{label}<input className="civic-control mt-2 w-full px-3 text-sm" required={required} type={type} value={value} onChange={(event)=>onChange(event.target.value)}/></label>}
function TextArea({label,onChange,required=false,value}:{label:string;onChange:(value:string)=>void;required?:boolean;value:string}){return <label className="block text-sm font-semibold">{label}<textarea className="civic-control mt-2 min-h-24 w-full resize-y px-3 py-2 text-sm" required={required} value={value} onChange={(event)=>onChange(event.target.value)}/></label>}
function SelectField({label,onChange,options,value}:{label:string;onChange:(value:string)=>void;options:Array<[string,string]>;value:string}){return <label className="block text-sm font-semibold">{label}<select className="civic-control mt-2 w-full px-3 text-sm" value={value} onChange={(event)=>onChange(event.target.value)}>{options.map(([key,text])=><option value={key} key={key}>{text}</option>)}</select></label>}
function PrimaryButton({children,loading}:{children:ReactNode;loading:boolean}){return <button className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-civic-sm bg-village-800 px-4 text-sm font-semibold text-white disabled:opacity-60" disabled={loading} type="submit">{loading?<Loader2 className="animate-spin" size={18}/>:children}</button>}
function Notice({children,tone}:{children:ReactNode;tone:"error"|"sample"|"success"|"info"}){const style={error:"border-civic-danger/20 bg-civic-danger-bg text-civic-danger",sample:"border-civic-warning/20 bg-civic-warning-bg text-civic-warning-ink",success:"border-village-100 bg-village-50 text-village-800",info:"border-civic-border bg-civic-soft text-civic-muted"}[tone];return <p className={`rounded-civic-sm border px-3 py-3 text-sm leading-[22px] ${style}`}>{children}</p>}
function EmptyState({text}:{text:string}){return <div className="civic-card px-4 py-8 text-center text-sm text-civic-muted">{text}</div>}
function LoadingBlock(){return <div className="grid min-h-64 place-items-center"><Loader2 className="animate-spin text-village-700" aria-label="Memuat"/></div>}
function formatDate(value:string){if(!value)return "-";const date=new Date(value.includes("T")?value:value.replace(" ","T"));return Number.isNaN(date.getTime())?value:new Intl.DateTimeFormat("id-ID",{day:"numeric",month:"short",year:"numeric",hour:value.length>10?"2-digit":undefined,minute:value.length>10?"2-digit":undefined}).format(date)}
function formatRupiah(value:number){return new Intl.NumberFormat("id-ID",{style:"currency",currency:"IDR",maximumFractionDigits:0,notation:value>=1_000_000_000?"compact":"standard"}).format(value)}
function messageOf(error:unknown,fallback:string){return error instanceof Error?error.message:fallback}
function auditLabel(value:string){return {submitted:"Pengajuan diterima",status_changed:"Status diperbarui",created:"Informasi dibuat",updated:"Informasi diperbarui",metadata_updated:"Metadata DIP diperbarui"}[value]||value}

const objectionReasons:Array<[string,string]>=[["request_rejected","Permohonan ditolak"],["information_unavailable","Informasi tidak tersedia"],["late_response","Jawaban melewati tenggat"],["fee_dispute","Keberatan biaya"],["incomplete_response","Jawaban tidak lengkap"],["periodic_not_published","Informasi berkala belum diumumkan"]];
const requestTransitions:Record<string,string[]>={submitted:["verified","rejected"],verified:["processing","rejected"],processing:["extended","fulfilled","rejected"],extended:["fulfilled","rejected"],fulfilled:["closed"],rejected:["closed"]};
const objectionTransitions:Record<string,string[]>={submitted:["review"],review:["accepted","rejected"],accepted:["resolved"],rejected:["resolved"]};
const statusLabels:Record<string,string>={verified:"Verifikasi",processing:"Proses",extended:"Perpanjang",fulfilled:"Informasi diberikan",rejected:"Tolak",closed:"Selesai",review:"Telaah",accepted:"Terima",resolved:"Selesaikan"};
