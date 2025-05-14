"use strict";(()=>{var e={};e.id=3006,e.ids=[3006],e.modules={3295:e=>{e.exports=require("next/dist/server/app-render/after-task-async-storage.external.js")},10846:e=>{e.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},19771:e=>{e.exports=require("process")},21572:e=>{e.exports=require("nodemailer")},27910:e=>{e.exports=require("stream")},28354:e=>{e.exports=require("util")},29294:e=>{e.exports=require("next/dist/server/app-render/work-async-storage.external.js")},34631:e=>{e.exports=require("tls")},41204:e=>{e.exports=require("string_decoder")},44870:e=>{e.exports=require("next/dist/compiled/next-server/app-route.runtime.prod.js")},55511:e=>{e.exports=require("crypto")},63033:e=>{e.exports=require("next/dist/server/app-render/work-unit-async-storage.external.js")},66136:e=>{e.exports=require("timers")},74075:e=>{e.exports=require("zlib")},79428:e=>{e.exports=require("buffer")},79551:e=>{e.exports=require("url")},82287:(e,o,r)=>{r.r(o),r.d(o,{patchFetch:()=>y,routeModule:()=>b,serverHooks:()=>x,workAsyncStorage:()=>v,workUnitAsyncStorage:()=>w});var t={};r.r(t),r.d(t,{POST:()=>f});var i=r(96559),s=r(48088),n=r(37719),a=r(32190),p=r(86434);let l=e=>`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>RainbowPaws Notification</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      margin: 0;
      padding: 0;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .header {
      background-color: #10B981;
      padding: 20px;
      text-align: center;
    }
    .header h1 {
      color: white;
      margin: 0;
      font-size: 24px;
    }
    .content {
      padding: 20px;
      background-color: #fff;
    }
    .footer {
      background-color: #f5f5f5;
      padding: 15px;
      text-align: center;
      font-size: 12px;
      color: #666;
    }
    .button {
      display: inline-block;
      background-color: #10B981;
      color: white;
      padding: 12px 24px;
      text-decoration: none;
      border-radius: 25px;
      margin: 20px 0;
      font-weight: normal;
    }
    .info-box {
      background-color: #f9f9f9;
      border: 1px solid #eee;
      border-radius: 4px;
      padding: 15px;
      margin: 15px 0;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>RainbowPaws</h1>
    </div>
    <div class="content">
      ${e}
    </div>
    <div class="footer">
      <p>&copy; ${new Date().getFullYear()} RainbowPaws - Pet Memorial Services</p>
      <p>This is an automated message, please do not reply to this email.</p>
    </div>
  </div>
</body>
</html>
`,c=(e,o)=>{let r="";return r="personal"===o?`
      <p>With your account, you can:</p>
      <ul>
        <li>Create beautiful memorials for your beloved pets</li>
        <li>Connect with compassionate service providers</li>
        <li>Share memories with family and friends</li>
      </ul>
    `:`
      <p>As a service provider, you can now:</p>
      <ul>
        <li>List your memorial services</li>
        <li>Connect with pet owners in your area</li>
        <li>Manage bookings and appointments</li>
      </ul>
      <p>Your account is currently under review. We'll notify you once your business is verified.</p>
    `,{subject:"Welcome to Rainbow Paws! \uD83C\uDF08",html:l(`
    <h2>Welcome to Rainbow Paws</h2>
    <p>Dear ${e},</p>
    <p>Thank you for joining Rainbow Paws! We're honored to have you as part of our community.</p>
    ${r}
    <div style="text-align: center;">
      <a href="http://localhost:3002/login" class="button">Get Started</a>
    </div>
    <p>If you have any questions, our support team is here to help.</p>
  `)}},u=e=>{let o=`http://localhost:3002/reset-password?token=${e}`;return{subject:"Reset Your Password",html:`
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Reset Your Password</title>
    <style>
      body {
        font-family: Arial, sans-serif;
        line-height: 1.6;
        color: #333;
        margin: 0;
        padding: 0;
      }
      .container {
        max-width: 600px;
        margin: 0 auto;
        padding: 20px;
      }
      h1 {
        color: #10B981;
        text-align: center;
        margin-top: 20px;
        margin-bottom: 20px;
        font-size: 24px;
      }
      .content {
        padding: 0 20px;
      }
      .button {
        display: inline-block;
        background-color: #10B981;
        color: white !important;
        padding: 12px 24px;
        text-decoration: none;
        border-radius: 25px;
        margin: 20px 0;
        font-weight: normal;
      }
      .footer {
        margin-top: 30px;
        padding-top: 20px;
        border-top: 1px solid #eee;
        text-align: center;
        font-size: 14px;
        color: #666;
      }
      .button-container {
        text-align: center;
        margin: 30px 0;
      }
    </style>
  </head>
  <body>
    <div class="container">
      <h1>Reset Your Password</h1>
      <div class="content">
        <p>Hello,</p>
        <p>We received a request to reset your password. Click the button below to create a new password:</p>
        <div class="button-container">
          <a href="${o}" class="button" style="color: white !important; text-decoration: none;">Reset Password</a>
        </div>
        <p>If you didn't request this, you can safely ignore this email.</p>
        <p>This link will expire in 1 hour for security reasons.</p>
      </div>
      <div class="footer">
        <p>Rainbow Paws - Pet Memorial Services</p>
      </div>
    </div>
  </body>
  </html>
  `}},d=e=>({subject:"Your Verification Code - Rainbow Paws",html:l(`
    <h2>Your Verification Code</h2>
    <p>Hello,</p>
    <p>Thank you for registering with Rainbow Paws. To complete your account verification, please use the following code:</p>
    <div style="text-align: center; margin: 30px 0;">
      <div style="background-color: #f3f4f6; padding: 20px; border-radius: 10px; font-size: 24px; letter-spacing: 5px; font-weight: bold;">
        ${e}
      </div>
    </div>
    <p>This code will expire in 10 minutes.</p>
    <p>If you didn't request this code, you can safely ignore this email.</p>
    <p>If you're having trouble with the verification process, please try the following:</p>
    <ul>
      <li>Make sure you're entering the code exactly as shown above</li>
      <li>Refresh the verification page and try again</li>
      <li>If the code has expired, you can request a new one</li>
    </ul>
  `)}),g=e=>({subject:"Booking Confirmation - Rainbow Paws",html:l(`
    <h2>Booking Confirmation</h2>
    <p>Dear ${e.customerName},</p>
    <p>Your booking has been successfully created and is now pending confirmation from the service provider.</p>

    <div class="info-box">
      <h3 style="margin-top: 0;">Booking Details</h3>
      <p><strong>Service:</strong> ${e.serviceName}</p>
      <p><strong>Provider:</strong> ${e.providerName}</p>
      <p><strong>Date:</strong> ${e.bookingDate}</p>
      <p><strong>Time:</strong> ${e.bookingTime}</p>
      <p><strong>Pet:</strong> ${e.petName}</p>
      <p><strong>Booking ID:</strong> ${e.bookingId}</p>
    </div>

    <p>You will receive another email once the service provider confirms your booking.</p>

    <div style="text-align: center;">
      <a href="http://localhost:3002/user/furparent_dashboard/bookings" class="button">View Booking</a>
    </div>

    <p>Thank you for choosing Rainbow Paws for your pet memorial needs.</p>
  `)}),m=e=>{let o="",r="";switch(e.status){case"confirmed":o="confirmed",r="Please arrive on time for your appointment.";break;case"completed":o="completed",r="Thank you for choosing our services.";break;case"cancelled":o="cancelled",r="If you have any questions about this cancellation, please contact us."}return{subject:`Booking ${o.charAt(0).toUpperCase()+o.slice(1)} - Rainbow Paws`,html:l(`
    <h2>Booking ${o.charAt(0).toUpperCase()+o.slice(1)}</h2>
    <p>Dear ${e.customerName},</p>
    <p>Your booking has been ${o}.</p>

    <div class="info-box">
      <h3 style="margin-top: 0;">Booking Details</h3>
      <p><strong>Service:</strong> ${e.serviceName}</p>
      <p><strong>Provider:</strong> ${e.providerName}</p>
      <p><strong>Date:</strong> ${e.bookingDate}</p>
      <p><strong>Time:</strong> ${e.bookingTime}</p>
      <p><strong>Pet:</strong> ${e.petName}</p>
      <p><strong>Booking ID:</strong> ${e.bookingId}</p>
      ${e.notes?`<p><strong>Notes:</strong> ${e.notes}</p>`:""}
    </div>

    <p>${r}</p>

    <div style="text-align: center;">
      <a href="http://localhost:3002/user/furparent_dashboard/bookings" class="button">View Booking</a>
    </div>

    <p>Thank you for choosing Rainbow Paws for your pet memorial needs.</p>
  `)}},h=e=>{let o="",r="";switch(e.status){case"approved":o="Business Verification Approved - Rainbow Paws",r=`
        <h2>Business Verification Approved</h2>
        <p>Dear ${e.contactName},</p>
        <p>Congratulations! Your business <strong>${e.businessName}</strong> has been verified and approved on Rainbow Paws.</p>
        <p>You can now start managing your services and receiving bookings from pet owners.</p>
        <div style="text-align: center;">
          <a href="http://localhost:3002/cremation/dashboard" class="button">Go to Dashboard</a>
        </div>
      `;break;case"rejected":o="Business Verification Update - Rainbow Paws",r=`
        <h2>Business Verification Update</h2>
        <p>Dear ${e.contactName},</p>
        <p>We regret to inform you that your business verification for <strong>${e.businessName}</strong> has not been approved at this time.</p>
        ${e.notes?`
          <div class="info-box">
            <h3 style="margin-top: 0;">Reason</h3>
            <p>${e.notes}</p>
          </div>
        `:""}
        <p>If you have any questions or would like to submit additional information, please contact our support team.</p>
      `;break;case"pending":o="Business Verification in Progress - Rainbow Paws",r=`
        <h2>Business Verification in Progress</h2>
        <p>Dear ${e.contactName},</p>
        <p>Your business verification for <strong>${e.businessName}</strong> is currently being reviewed by our team.</p>
        <p>This process typically takes 1-3 business days. We'll notify you once the review is complete.</p>
        <p>Thank you for your patience.</p>
      `;break;case"documents_required":o="Documents Required for Business Verification - Rainbow Paws",r=`
        <h2>Documents Required</h2>
        <p>Dear ${e.contactName},</p>
        <p>To complete the verification process for <strong>${e.businessName}</strong>, we need additional documents from you.</p>
        ${e.notes?`
          <div class="info-box">
            <h3 style="margin-top: 0;">Required Documents</h3>
            <p>${e.notes}</p>
          </div>
        `:""}
        <p>Please log in to your account and upload the required documents as soon as possible.</p>
        <div style="text-align: center;">
          <a href="http://localhost:3002/cremation/documents" class="button">Upload Documents</a>
        </div>
      `}return{subject:o,html:l(r)}};async function f(e){try{let o,r,{type:t,email:i,firstName:s,resetToken:n,accountType:l,otp:f,bookingDetails:b,businessDetails:v,useQueue:w=!1}=await e.json();switch(console.log("Email request received:",{type:t,email:i,useQueue:w}),t){case"reset":if(!i||!n)return a.NextResponse.json({error:"Missing required parameters for password reset email"},{status:400});o={to:i,...u(n)};break;case"welcome":if(!i||!s)return a.NextResponse.json({error:"Missing required parameters for welcome email"},{status:400});o={to:i,...c(s,l||"personal")};break;case"otp":if(!i||!f)return a.NextResponse.json({error:"Missing required parameters for OTP email"},{status:400});o={to:i,...d(f)};break;case"booking_confirmation":if(!i||!b)return a.NextResponse.json({error:"Missing required parameters for booking confirmation email"},{status:400});o={to:i,...g(b)};break;case"booking_status_update":if(!i||!b)return a.NextResponse.json({error:"Missing required parameters for booking status update email"},{status:400});o={to:i,...m(b)};break;case"business_verification":if(!i||!v)return a.NextResponse.json({error:"Missing required parameters for business verification email"},{status:400});o={to:i,...h(v)};break;default:return a.NextResponse.json({error:"Invalid email type"},{status:400})}if(console.log("Preparing to send email:",{to:o.to,subject:o.subject,type:t,useQueue:w}),w?(console.log("Queueing email..."),r=await (0,p.ec)(o)):(console.log("Sending email directly..."),r=await (0,p.ZM)(o)),console.log("Email result:",r),!r.success)throw console.error("Email sending failed:",r.error),Error(r.error||"Failed to send email");let x={success:!0,message:`Email ${w?"queued":"sent"} to ${i} (${t})`};if(w&&"queueId"in r)return a.NextResponse.json({...x,queueId:r.queueId});if(!w&&"messageId"in r)return a.NextResponse.json({...x,messageId:r.messageId});return a.NextResponse.json(x)}catch(e){return console.error("Email processing error:",e),a.NextResponse.json({error:"Failed to process email request",message:e instanceof Error?e.message:"Unknown error"},{status:500})}}let b=new i.AppRouteRouteModule({definition:{kind:s.RouteKind.APP_ROUTE,page:"/api/email/route",pathname:"/api/email",filename:"route",bundlePath:"app/api/email/route"},resolvedPagePath:"C:\\xampp\\htdocs\\app_rainbowpaws\\src\\app\\api\\email\\route.ts",nextConfigOutput:"standalone",userland:t}),{workAsyncStorage:v,workUnitAsyncStorage:w,serverHooks:x}=b;function y(){return(0,n.patchFetch)({workAsyncStorage:v,workUnitAsyncStorage:w})}},91645:e=>{e.exports=require("net")},94735:e=>{e.exports=require("events")}};var o=require("../../../webpack-runtime.js");o.C(e);var r=e=>o(o.s=e),t=o.X(0,[4447,580,6101,2248],()=>r(82287));module.exports=t})();