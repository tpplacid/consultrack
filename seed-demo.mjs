/**
 * Demo org seed script
 * Run: node seed-demo.mjs
 * Creates a fully-populated demo org with 10 employees + 100 leads.
 * All accounts: password = Demo@1234
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://jdcwhtzxueptxiekzhni.supabase.co'
const SERVICE_KEY  = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpkY3dodHp4dWVwdHhpZWt6aG5pIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzA1MzYyMiwiZXhwIjoyMDkyNjI5NjIyfQ.LzTZWfMO5aE7ouQbm_mqomGuCRdBT21TtIQhNUGwXdA'

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const PASSWORD = 'Demo@1234'

// ─── helpers ────────────────────────────────────────────────────────────────

function rnd(arr) { return arr[Math.floor(Math.random() * arr.length)] }
function rndInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min }
function daysAgo(n) { return new Date(Date.now() - n * 86400000).toISOString() }
function daysFromNow(n) { return new Date(Date.now() + n * 86400000).toISOString() }
function phone() { return `9${rndInt(100000000, 999999999)}` }

// ─── data pools ─────────────────────────────────────────────────────────────

const FIRST = ['Arjun','Priya','Rahul','Sneha','Vikram','Divya','Rohan','Ananya','Karthik','Meera',
  'Siddharth','Pooja','Aditya','Nisha','Suresh','Kavya','Nikhil','Lakshmi','Harish','Riya',
  'Mohan','Swathi','Rajesh','Deepa','Ganesh','Shreya','Varun','Keerthi','Prasad','Anjali',
  'Vivek','Bhavana','Murali','Yamini','Shankar','Nithya','Venkat','Shalini','Prakash','Vidya']
const LAST  = ['Sharma','Nair','Patel','Reddy','Kumar','Iyer','Singh','Menon','Krishnan','Mehta',
  'Gupta','Pillai','Rao','Joshi','Verma','Bhat','Shetty','Murthy','Chandra','Das']
const LOCATIONS = ['Chennai','Bangalore','Hyderabad','Mumbai','Coimbatore','Madurai','Pune',
  'Kochi','Trichy','Salem','Vellore','Erode','Tirunelveli','Delhi','Kolkata']
const COURSES   = ['B.Tech CSE','B.Tech ECE','B.Tech Mech','BBA','MBA','B.Sc Computer Science',
  'B.Com','BCA','B.Arch','M.Tech','MCA','B.Pharm','MBBS','B.Sc Nursing']
const COLLEGES  = ['SRM','VIT','Amrita','PSG','KCT','Sathyabama','Saveetha','SASTRA',
  'Manipal','Karunya','Presidency','Anna University','LPU','Christ University']
const SOURCES   = ['meta','meta','meta','meta','offline','offline','referral']
const STAGES    = ['0','A','A','A','B','B','B','C','C','C','D','D','F','F','E','X']
const SUB_A     = ['DNP-needs-followup','Answered-Interested','Answered-Negotiation','Details-Sent']
const SUB_B     = ['DNP-needs-followup','Answered-Interested','Answered-Negotiation']
const SUB_C     = ['C1-Contacted-by-Telesales','C2-Contacted-by-Counsellor','C3-Contacted-by-TL']
const INCOMES   = ['Below 3L','3L–6L','6L–10L','Above 10L']
const DECISIONS = ['father','mother','sibling','relative']
const LEAD_TYPES= ['Engineering','Medical','Management','Arts & Science','Law']

function fullName() { return `${rnd(FIRST)} ${rnd(LAST)}` }

// ─── main ───────────────────────────────────────────────────────────────────

async function main() {
  console.log('🌱 Seeding demo org…\n')

  // 1. Create org
  const { data: org, error: orgErr } = await supabase
    .from('orgs')
    .insert({ name: 'Demo Institute', slug: 'demo', require_attendance_key: false })
    .select()
    .single()
  if (orgErr) { console.error('Org error:', orgErr.message); process.exit(1) }
  console.log(`✅ Org created: ${org.id}`)

  // 2. Create auth users + employee rows
  const employeeDefs = [
    { name: 'Rajiv Sharma',    email: 'admin@demoinstitute.in',      role: 'ad' },
    { name: 'Priya Nair',      email: 'tl.priya@demoinstitute.in',   role: 'tl' },
    { name: 'Arjun Menon',     email: 'tl.arjun@demoinstitute.in',   role: 'tl' },
    { name: 'Sneha Patel',     email: 'c.sneha@demoinstitute.in',    role: 'counsellor' },
    { name: 'Karthik Raj',     email: 'c.karthik@demoinstitute.in',  role: 'counsellor' },
    { name: 'Divya Krishnan',  email: 'c.divya@demoinstitute.in',    role: 'counsellor' },
    { name: 'Rahul Singh',     email: 'c.rahul@demoinstitute.in',    role: 'counsellor' },
    { name: 'Meera Iyer',      email: 'ts.meera@demoinstitute.in',   role: 'telesales' },
    { name: 'Anand Kumar',     email: 'ts.anand@demoinstitute.in',   role: 'telesales' },
    { name: 'Pooja Mehta',     email: 'ts.pooja@demoinstitute.in',   role: 'telesales' },
  ]

  const empIds = {}

  for (const def of employeeDefs) {
    const { data: authUser, error: authErr } = await supabase.auth.admin.createUser({
      email: def.email,
      password: PASSWORD,
      email_confirm: true,
    })
    if (authErr) { console.error(`Auth error (${def.email}):`, authErr.message); continue }

    const { data: emp, error: empErr } = await supabase
      .from('employees')
      .insert({
        org_id: org.id,
        email: def.email,
        name: def.name,
        role: def.role,
        is_active: true,
        is_on_leave: false,
      })
      .select()
      .single()
    if (empErr) { console.error(`Employee error (${def.name}):`, empErr.message); continue }
    empIds[def.role === 'ad' ? 'ad' : def.name] = emp.id
    console.log(`  👤 ${def.name} (${def.role}) — ${def.email}`)
  }

  // Set reports_to
  const reportMap = [
    ['Priya Nair',    empIds['ad']],
    ['Arjun Menon',   empIds['ad']],
    ['Sneha Patel',   empIds['Priya Nair']],
    ['Karthik Raj',   empIds['Priya Nair']],
    ['Divya Krishnan',empIds['Arjun Menon']],
    ['Rahul Singh',   empIds['Arjun Menon']],
    ['Meera Iyer',    empIds['Priya Nair']],
    ['Anand Kumar',   empIds['Priya Nair']],
    ['Pooja Mehta',   empIds['Arjun Menon']],
  ]
  for (const [name, managerId] of reportMap) {
    if (!empIds[name] || !managerId) continue
    await supabase.from('employees').update({ reports_to: managerId }).eq('id', empIds[name])
  }
  console.log('\n✅ Employee hierarchy set')

  // Guard — abort if no employees were created
  const createdCount = Object.keys(empIds).filter(k => empIds[k]).length
  if (createdCount === 0) { console.error('No employees created — aborting.'); process.exit(1) }

  // Owner pool — counsellors + telesales get leads
  const ownerPool = [
    empIds['Sneha Patel'], empIds['Sneha Patel'],
    empIds['Karthik Raj'], empIds['Karthik Raj'],
    empIds['Divya Krishnan'], empIds['Divya Krishnan'],
    empIds['Rahul Singh'], empIds['Rahul Singh'],
    empIds['Meera Iyer'],
    empIds['Anand Kumar'],
    empIds['Pooja Mehta'],
  ].filter(Boolean)

  const managerOf = {
    [empIds['Sneha Patel']]:    empIds['Priya Nair'],
    [empIds['Karthik Raj']]:    empIds['Priya Nair'],
    [empIds['Divya Krishnan']]: empIds['Arjun Menon'],
    [empIds['Rahul Singh']]:    empIds['Arjun Menon'],
    [empIds['Meera Iyer']]:     empIds['Priya Nair'],
    [empIds['Anand Kumar']]:    empIds['Priya Nair'],
    [empIds['Pooja Mehta']]:    empIds['Arjun Menon'],
  }

  // SLA days per stage
  const SLA_DAYS = { A: 1, B: 5, C: 5, D: 20 }

  // 3. Create 100 leads
  console.log('\n📋 Creating 100 leads…')
  const leadIds = []

  for (let i = 0; i < 100; i++) {
    const source  = rnd(SOURCES)
    const stage   = rnd(STAGES)
    const ownerId = rnd(ownerPool)
    const managerId = managerOf[ownerId] || null
    const createdAt = daysAgo(rndInt(1, 180))

    const slaDays = SLA_DAYS[stage]
    let slaDeadline = null
    if (slaDays && source === 'meta') {
      const base = new Date(createdAt)
      base.setDate(base.getDate() + slaDays)
      slaDeadline = base.toISOString()
    }

    let subStage = null
    if (stage === 'A') subStage = rnd(SUB_A)
    if (stage === 'B') subStage = rnd(SUB_B)
    if (stage === 'C') subStage = rnd(SUB_C)

    const hasPayment = stage === 'F' || (stage === 'D' && Math.random() > 0.5)
    const appFees  = hasPayment ? rndInt(500,  2000)  : null
    const bookFees = hasPayment ? rndInt(2000, 10000) : null
    const tuition  = stage === 'F' ? rndInt(50000, 200000) : null

    const numColleges = rndInt(1, 4)
    const colleges = Array.from({ length: numColleges }, () => rnd(COLLEGES))
      .filter((v, i, a) => a.indexOf(v) === i)

    const nextFollowup = ['B','C'].includes(stage)
      ? daysFromNow(rndInt(1, 7))
      : null

    const { data: lead, error: leadErr } = await supabase
      .from('leads')
      .insert({
        org_id: org.id,
        name: fullName(),
        phone: phone(),
        source,
        main_stage: stage,
        sub_stage: subStage,
        owner_id: ownerId,
        reporting_manager_id: managerId,
        stage_entered_at: createdAt,
        sla_deadline: slaDeadline,
        next_followup_at: nextFollowup,
        lead_type: rnd(LEAD_TYPES),
        location: rnd(LOCATIONS),
        twelfth_score: rndInt(55, 98),
        preferred_course: rnd(COURSES),
        interested_colleges: colleges,
        alternate_courses: [rnd(COURSES)],
        decision_maker: rnd(DECISIONS),
        income_status: rnd(INCOMES),
        loan_status: rnd(['yes','yes','no']),
        approved: source === 'meta' ? true : Math.random() > 0.3,
        application_fees: appFees,
        booking_fees: bookFees,
        tuition_fees: tuition,
        created_at: createdAt,
        updated_at: createdAt,
      })
      .select('id')
      .single()

    if (leadErr) { console.error(`Lead ${i} error:`, leadErr.message); continue }
    leadIds.push({ id: lead.id, ownerId, stage, createdAt })
  }
  console.log(`✅ ${leadIds.length} leads created`)

  // 4. Add activities
  console.log('\n📝 Adding activities…')
  const activityRows = []
  for (const { id: leadId, ownerId, stage, createdAt } of leadIds) {
    activityRows.push({
      org_id: org.id, lead_id: leadId, employee_id: ownerId,
      activity_type: 'lead_created',
      note: 'Lead added to pipeline',
      created_at: createdAt,
    })
    if (['B','C','D','F'].includes(stage)) {
      activityRows.push({
        org_id: org.id, lead_id: leadId, employee_id: ownerId,
        activity_type: 'stage_change',
        stage_from: '0', stage_to: 'A',
        note: 'Moved to calling stage',
        created_at: new Date(new Date(createdAt).getTime() + 86400000).toISOString(),
      })
    }
    if (['C','D','F'].includes(stage)) {
      activityRows.push({
        org_id: org.id, lead_id: leadId, employee_id: ownerId,
        activity_type: 'stage_change',
        stage_from: 'A', stage_to: 'B',
        note: 'Advanced to follow-up',
        created_at: new Date(new Date(createdAt).getTime() + 2 * 86400000).toISOString(),
      })
    }
    if (Math.random() > 0.5) {
      activityRows.push({
        org_id: org.id, lead_id: leadId, employee_id: ownerId,
        activity_type: 'comment',
        note: rnd([
          'Student is interested, needs more info on scholarships.',
          'Parent called — father is the decision maker.',
          'Requested college brochures via WhatsApp.',
          'Tentatively confirmed — follow up next week.',
          'Student has competitive exam next month — revisit after.',
          'Good profile, high chances of admission.',
        ]),
        created_at: new Date(new Date(createdAt).getTime() + rndInt(1,5) * 86400000).toISOString(),
      })
    }
  }
  // Insert in batches
  for (let i = 0; i < activityRows.length; i += 50) {
    await supabase.from('activities').insert(activityRows.slice(i, i + 50))
  }
  console.log(`✅ ${activityRows.length} activities created`)

  // 5. Create some deadline breaches
  console.log('\n⚠️  Creating deadline breaches…')
  const breachLeads = leadIds.filter(l => ['A','B','C'].includes(l.stage)).slice(0, 15)
  const resolutions = ['pending','pending','pending','closed','explanation_requested']
  const breachRows = breachLeads.map(l => ({
    org_id: org.id,
    lead_id: l.id,
    owner_id: l.ownerId,
    stage: l.stage,
    breached_at: daysAgo(rndInt(1, 10)),
    resolution: rnd(resolutions),
    explanation: null,
    explanation_status: null,
    created_at: daysAgo(rndInt(1, 10)),
  }))
  const { error: bErr } = await supabase.from('sla_breaches').insert(breachRows)
  if (bErr) console.error('Breach error:', bErr.message)
  else console.log(`✅ ${breachRows.length} deadline breaches created`)

  // 6. WhatsApp templates
  console.log('\n💬 Creating WhatsApp templates…')
  await supabase.from('wa_templates').insert([
    {
      org_id: org.id,
      name: 'Initial Outreach',
      body: 'Hi {{name}}, this is {{counsellor}} from Demo Institute. We saw your enquiry about {{course}}. Would you be available for a quick call to discuss?',
      is_active: true,
    },
    {
      org_id: org.id,
      name: 'Follow Up',
      body: 'Hi {{name}}, just checking in on your admission decision. We have limited seats for {{course}} — happy to answer any questions you have!',
      is_active: true,
    },
    {
      org_id: org.id,
      name: 'Confirmation',
      body: 'Congratulations {{name}}! Your seat at {{college}} for {{course}} has been confirmed. Please find the next steps in the attached document.',
      is_active: true,
    },
  ])
  console.log('✅ WhatsApp templates created')

  // 7. Attendance (last 7 working days)
  console.log('\n📅 Creating attendance records…')
  const allEmpIds = Object.values(empIds).filter(Boolean)
  const attendanceRows = []
  for (let d = 6; d >= 0; d--) {
    const date = new Date(Date.now() - d * 86400000)
    const dow = date.getDay()
    if (dow === 0 || dow === 6) continue // skip weekends
    const workDate = date.toISOString().split('T')[0]
    for (const empId of allEmpIds) {
      const status = Math.random() > 0.15 ? 'present' : rnd(['absent','half_day'])
      attendanceRows.push({
        org_id: org.id,
        employee_id: empId,
        work_date: workDate,
        clock_in:  status !== 'absent' ? `${workDate}T09:${rndInt(0,30).toString().padStart(2,'0')}:00+05:30` : null,
        clock_out: status === 'present' ? `${workDate}T18:${rndInt(0,30).toString().padStart(2,'0')}:00+05:30` : null,
        wifi_verified: Math.random() > 0.2,
        status,
      })
    }
  }
  await supabase.from('attendance').insert(attendanceRows)
  console.log(`✅ ${attendanceRows.length} attendance records created`)

  // ─── summary ──────────────────────────────────────────────────────────────
  console.log('\n' + '─'.repeat(50))
  console.log('🎉 Demo org seeded successfully!\n')
  console.log('Org ID:', org.id)
  console.log('Password for all accounts: Demo@1234\n')
  console.log('Accounts:')
  for (const def of employeeDefs) {
    console.log(`  ${def.role.padEnd(10)} ${def.email}`)
  }
  console.log('\nLog in at your Admishine URL with any of the above.')
}

main().catch(e => { console.error(e); process.exit(1) })
