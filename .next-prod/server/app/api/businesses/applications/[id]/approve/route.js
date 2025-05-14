"use strict";(()=>{var e={};e.id=5794,e.ids=[5794],e.modules={3295:e=>{e.exports=require("next/dist/server/app-render/after-task-async-storage.external.js")},10846:e=>{e.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},17202:(e,s,r)=>{r.r(s),r.d(s,{patchFetch:()=>_,routeModule:()=>c,serverHooks:()=>b,workAsyncStorage:()=>d,workUnitAsyncStorage:()=>m});var a={};r.r(a),r.d(a,{POST:()=>l});var i=r(96559),t=r(48088),o=r(37719),n=r(32190),p=r(5069);let{sendBusinessVerificationEmail:u}=r(20048);async function l(e){let s=new URL(e.url).pathname.split("/"),r=s[s.length-2];try{let s,a=parseInt(r);if(isNaN(a))return n.NextResponse.json({message:"Invalid business ID"},{status:400});let{notes:i}=await e.json().catch(()=>({})),t=(await (0,p.query)(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = DATABASE()
      AND table_name IN ('business_profiles', 'service_providers')
    `)).map(e=>e.table_name);console.log("Available tables:",t);let o=t.includes("service_providers"),l=t.includes("business_profiles");if(!o&&!l)return console.error("Neither business_profiles nor service_providers table exists in the database"),n.NextResponse.json({message:"Database schema error: Required tables do not exist"},{status:500});let c=o?"service_providers":"business_profiles";console.log(`Using table: ${c}`);let d=await (0,p.query)(`UPDATE ${c}
       SET application_status = 'approved',
           verification_date = NOW(),
           verification_notes = ?,
           updated_at = NOW()
       WHERE id = ?`,[i||"Application approved",a]);if(0===d.affectedRows)return n.NextResponse.json({message:"Business profile not found"},{status:404});let m=(o?await (0,p.query)(`SELECT
          bp.*,
          u.email,
          u.first_name,
          u.last_name,
          bp.name as business_name
         FROM service_providers bp
         JOIN users u ON bp.user_id = u.id
         WHERE bp.id = ?`,[a]):await (0,p.query)(`SELECT bp.*, u.email, u.first_name, u.last_name
         FROM business_profiles bp
         JOIN users u ON bp.user_id = u.id
         WHERE bp.id = ?`,[a]))[0];await (0,p.query)(`UPDATE users u
       JOIN ${c} bp ON u.id = bp.user_id
       SET u.is_verified = 1
       WHERE bp.id = ?`,[a]);try{let e=await (0,p.query)(`
        SELECT COUNT(*) as count
        FROM information_schema.tables
        WHERE table_schema = ? AND table_name = 'notifications'
      `,["rainbow_paws"]);e&&Array.isArray(e)&&e[0]&&e[0].count>0&&await (0,p.query)(`
          INSERT INTO notifications (user_id, title, message, type, link, is_read)
          VALUES (?, ?, ?, ?, ?, ?)
        `,[m.user_id,"Application Approved",`Your business application for ${m.business_name||m.name} has been approved. You can now start offering services.`,"success","/business/dashboard",0])}catch(e){console.error("Failed to create notification:",e)}await (0,p.query)(`INSERT INTO admin_logs (action, entity_type, entity_id, details, admin_id)
       VALUES (?, ?, ?, ?, ?)`,["approve_business",c,a,JSON.stringify({businessName:m?.business_name||m?.name,notes:i||"Application approved"}),1]).catch(e=>console.error("Failed to log admin action:",e));let b=!1;if(m&&m.email)try{console.log(`Sending approval email to ${m.email} for business ${m.business_name||m.name}`);let e=await u(m.email,{businessName:m.business_name||m.name,contactName:`${m.first_name} ${m.last_name}`,status:"approved",notes:i||"Your application has been approved. You can now start using our services."});e.success?(console.log(`Approval email sent successfully to ${m.email}. Message ID: ${e.messageId}`),b=!0):console.error("Failed to send approval email:",e.error),await (0,p.query)(`INSERT INTO notifications (user_id, title, message, type, link)
           VALUES (?, ?, ?, ?, ?)`,[m.user_id,"Application Approved",`Your business application for ${m.business_name||m.name} has been approved.`,"success","/cremation/dashboard"]).catch(e=>console.error("Failed to create notification:",e))}catch(e){console.error("Error sending approval email:",e)}return n.NextResponse.json({message:"Application approved successfully",businessId:a,businessName:m?.business_name||m?.name,emailSent:b})}catch(e){return console.error("Error approving application:",e),n.NextResponse.json({message:"Failed to approve application"},{status:500})}}let c=new i.AppRouteRouteModule({definition:{kind:t.RouteKind.APP_ROUTE,page:"/api/businesses/applications/[id]/approve/route",pathname:"/api/businesses/applications/[id]/approve",filename:"route",bundlePath:"app/api/businesses/applications/[id]/approve/route"},resolvedPagePath:"C:\\xampp\\htdocs\\app_rainbowpaws\\src\\app\\api\\businesses\\applications\\[id]\\approve\\route.ts",nextConfigOutput:"standalone",userland:a}),{workAsyncStorage:d,workUnitAsyncStorage:m,serverHooks:b}=c;function _(){return(0,o.patchFetch)({workAsyncStorage:d,workUnitAsyncStorage:m})}},19771:e=>{e.exports=require("process")},21572:e=>{e.exports=require("nodemailer")},27910:e=>{e.exports=require("stream")},28354:e=>{e.exports=require("util")},29294:e=>{e.exports=require("next/dist/server/app-render/work-async-storage.external.js")},34631:e=>{e.exports=require("tls")},41204:e=>{e.exports=require("string_decoder")},44870:e=>{e.exports=require("next/dist/compiled/next-server/app-route.runtime.prod.js")},55511:e=>{e.exports=require("crypto")},63033:e=>{e.exports=require("next/dist/server/app-render/work-unit-async-storage.external.js")},66136:e=>{e.exports=require("timers")},74075:e=>{e.exports=require("zlib")},79428:e=>{e.exports=require("buffer")},79551:e=>{e.exports=require("url")},91645:e=>{e.exports=require("net")},94735:e=>{e.exports=require("events")}};var s=require("../../../../../../webpack-runtime.js");s.C(e);var r=e=>s(s.s=e),a=s.X(0,[4447,580,6101,9570],()=>r(17202));module.exports=a})();