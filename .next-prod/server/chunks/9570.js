exports.id=9570,exports.ids=[9570],exports.modules={5069:(e,o,t)=>{"use strict";let s;t.r(o),t.d(o,{default:()=>d,query:()=>c,testConnection:()=>l});var r=t(46101);let n=(e,o)=>{},a={host:"localhost",user:"root",database:"rainbow_paws",port:3306};n("Database configuration in db.ts:",{host:a.host,user:a.user,port:a.port,database:a.database});let i={host:"localhost",user:"root",password:"",database:"rainbow_paws",port:3306,waitForConnections:!0,connectionLimit:10,queueLimit:0,socketPath:void 0,insecureAuth:!0};n("Final database configuration:",{host:i.host,user:i.user,port:i.port,database:i.database,environment:"production"});try{n("Attempting to create MySQL connection pool with config:",{host:i.host,user:i.user,database:i.database,port:i.port}),s=r.createPool(i),n("MySQL connection pool created successfully"),(async()=>{try{let e=await s.getConnection();n("Successfully got a test connection from the pool"),e.release(),n("Test connection released back to pool")}catch(e){console.error("Failed to get a test connection from the pool:",e)}})()}catch(e){console.error("Error creating MySQL connection pool:",e),console.error("Error details:",e.message),"ECONNREFUSED"===e.code?console.error("Connection refused. Make sure MySQL is running on port 3306."):"ER_ACCESS_DENIED_ERROR"===e.code?console.error("Access denied. Check your MySQL username and password."):"ER_BAD_DB_ERROR"===e.code&&console.error("Database does not exist. Make sure the database name is correct."),n("Creating fallback MySQL connection pool with default values");try{s=r.createPool(i),n("Fallback pool created successfully")}catch(e){console.error("Failed to create fallback pool:",e),s=r.createPool({host:"localhost",user:"root",password:"",database:"rainbow_paws",port:3306})}}async function c(e,o=[]){try{let t=await s.getConnection();n("Got connection from pool");try{let[s]=await t.query(e,o);return s}finally{t.release(),n("Connection released back to pool")}}catch(t){if(console.error("Database query error:",t),console.error("Failed query:",e),console.error("Query parameters:",o),"ECONNREFUSED"===t.code)console.error("Database connection refused. Make sure MySQL is running and accessible."),console.error("Current connection settings:",{host:a.host,port:a.port,user:a.user,database:a.database});else if("ER_ACCESS_DENIED_ERROR"===t.code)console.error("Access denied. Check your username and password.");else if("ER_BAD_DB_ERROR"===t.code)console.error("Database does not exist. Make sure the database name is correct.");else if("PROTOCOL_CONNECTION_LOST"===t.code){console.error("Database connection was closed. Trying to reconnect...");try{s=r.createPool(i),console.log("Reconnected to MySQL successfully")}catch(e){console.error("Failed to reconnect to MySQL:",e)}}throw t}}async function l(){try{n("Testing database connection..."),await c("SELECT 1 as test"),n("Database connection test successful");try{n("Checking users table...");let e=await c("SELECT COUNT(*) as count FROM users");n(`Users table has ${e[0].count} records`)}catch(e){console.error("Error checking users table:",e.message)}return!0}catch(e){console.error("Database connection test failed:",e);try{n("Trying direct connection without pool...");let e=await r.createConnection({host:i.host,user:i.user,password:i.password,port:3306,database:i.database});return n("Direct connection successful"),await e.end(),n("Direct connection closed"),s=r.createPool(i),n("Connection pool recreated"),!0}catch(e){return console.error("Direct connection failed:",e),!1}}}let d=s},20048:(e,o,t)=>{"use strict";let s=t(21572),{query:r}=t(5069),n=(e,o)=>`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${e}</title>
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
        .code-container {
          text-align: center;
          margin: 30px 0;
        }
        .code {
          background-color: #f3f4f6;
          padding: 15px 20px;
          border-radius: 10px;
          font-size: 24px;
          letter-spacing: 5px;
          font-weight: bold;
          display: inline-block;
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
        <h1>${e}</h1>
        <div class="content">
          ${o}
        </div>
        <div class="footer">
          <p>Rainbow Paws - Pet Memorial Services</p>
        </div>
      </div>
    </body>
    </html>
  `,a=()=>{if("true"===process.env.DEV_EMAIL_MODE)return console.log("\uD83D\uDD14 DEV EMAIL MODE: Creating simulated email transporter"),{sendMail:async e=>{if(console.log("\uD83D\uDCE7 DEV MODE: Email would be sent to:",e.to),console.log("\uD83D\uDCD1 DEV MODE: Subject:",e.subject),e.subject.includes("Verification Code")){let o=e.html.match(/(\d{6})/);o&&console.log("\uD83D\uDD11 DEV MODE: OTP code is",o[1])}if(e.subject.includes("Reset Your Password")){let o=e.html.match(/token=([a-zA-Z0-9_-]+)/);if(o)console.log("\uD83D\uDD11 DEV MODE: Reset token is",o[1]),console.log(`🔗 DEV MODE: Reset link: http://localhost:3002/reset-password?token=${o[1]}`);else{let o=e.html.match(/token=([^"&'\s]+)/);o&&(console.log("\uD83D\uDD11 DEV MODE: Reset token is",o[1]),console.log(`🔗 DEV MODE: Reset link: http://localhost:3002/reset-password?token=${o[1]}`))}}return{messageId:`dev-mode-${Date.now()}`,accepted:[e.to],rejected:[]}}};if(!process.env.SMTP_USER||!process.env.SMTP_PASS)throw console.error("❌ ERROR: SMTP credentials are not properly configured"),Error("Email service not properly configured");return console.log("\uD83D\uDCE7 Creating real email transporter with SMTP settings:"),console.log(`- Host: ${process.env.SMTP_HOST||"smtp.gmail.com"}`),console.log(`- Port: ${process.env.SMTP_PORT||"587"}`),console.log(`- Secure: ${"true"===process.env.SMTP_SECURE}`),console.log(`- User: ${process.env.SMTP_USER.substring(0,3)}...`),s.createTransport({host:process.env.SMTP_HOST||"smtp.gmail.com",port:parseInt(process.env.SMTP_PORT||"587"),secure:"true"===process.env.SMTP_SECURE,auth:{user:process.env.SMTP_USER,pass:process.env.SMTP_PASS},tls:{rejectUnauthorized:!1}})},i=async e=>{try{console.log(`Attempting to send email to ${e.to}`);let o=a(),t={from:e.from||`"Rainbow Paws" <${process.env.SMTP_FROM||process.env.SMTP_USER||"no-reply@rainbowpaws.com"}>`,to:e.to,subject:e.subject,html:e.html,text:e.text||e.html.replace(/<[^>]*>?/gm,"").replace(/&nbsp;/g," ")},s=await o.sendMail(t);return console.log(`Email sent successfully to ${e.to}. Message ID: ${s.messageId}`),{success:!0,messageId:s.messageId}}catch(o){if(console.error("Error sending email:",o),"true"===process.env.DEV_EMAIL_MODE)return console.log("DEV MODE: Simulating email success despite error"),{success:!0,messageId:`dev-mode-error-${Date.now()}`};return console.error("Email sending failed with details:"),console.error("- To:",e.to),console.error("- Subject:",e.subject),console.error("- Error:",o.message),"EAUTH"===o.code?console.error("Authentication error. Check your SMTP credentials."):"ESOCKET"===o.code?console.error("Socket error. Check your SMTP host and port settings."):"ETIMEDOUT"===o.code&&console.error("Connection timed out. Check your network and SMTP server settings."),{success:!1,error:o.message||"Unknown error",code:o.code}}},c=async(e,o,t)=>i({to:e,subject:"Welcome to Rainbow Paws",html:n("Welcome to Rainbow Paws",`
    <p>Hello ${o},</p>
    <p>Thank you for joining Rainbow Paws. We're excited to have you as a ${"business"===t?"business partner":"fur parent"}.</p>
    <p>You can now access all our features and services.</p>
    <div class="button-container">
      <a href="http://localhost:3002" class="button" style="color: white !important; text-decoration: none;">
        Go to Dashboard
      </a>
    </div>
    <p>If you have any questions, please don't hesitate to contact us.</p>
  `)}),l=async(e,o)=>{let t=`http://localhost:3002/reset-password?token=${o}`;return i({to:e,subject:"Reset Your Password",html:`
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
            <a href="${t}" class="button" style="color: white !important; text-decoration: none;">Reset Password</a>
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
  `})},d=async(e,o)=>i({to:e,subject:"Your Verification Code",html:n("Your Verification Code",`
    <p>Hello,</p>
    <p>Thank you for registering with Rainbow Paws. To complete your account verification, please use the following code:</p>
    <div class="code-container">
      <div class="code">${o}</div>
    </div>
    <p>This code will expire in 10 minutes.</p>
    <p>If you didn't request this code, you can safely ignore this email.</p>
  `)}),p=async(e,o)=>i({to:e,subject:"Booking Confirmation",html:n("Booking Confirmation",`
    <p>Hello ${o.customerName},</p>
    <p>Your booking has been confirmed. Here are the details:</p>
    <div class="info-box">
      <p><strong>Service:</strong> ${o.serviceName}</p>
      <p><strong>Provider:</strong> ${o.providerName}</p>
      <p><strong>Date:</strong> ${o.bookingDate}</p>
      <p><strong>Time:</strong> ${o.bookingTime}</p>
      <p><strong>Pet:</strong> ${o.petName}</p>
      <p><strong>Booking ID:</strong> ${o.bookingId}</p>
    </div>
    <p>Thank you for choosing Rainbow Paws for your pet memorial needs.</p>
    <div class="button-container">
      <a href="http://localhost:3002/user/furparent_dashboard/bookings" class="button" style="color: white !important; text-decoration: none;">
        View Booking
      </a>
    </div>
  `)}),u=async(e,o)=>{let t="",s="Business Verification Update",r="business_verification";switch(o.status){case"approved":s="Business Verification Approved",t="has been verified and approved",r="business_approval";break;case"rejected":s="Business Verification Update",t="verification has been declined",r="business_rejection";break;case"documents_required":s="Additional Documents Required",t="requires additional documentation",r="business_documents_required";break;default:s="Business Verification Update",t="status has been updated",r="business_verification"}let a=s;return i({to:e,subject:a,html:n(s,`
    <p>Dear ${o.contactName},</p>
    <p>Your business <strong>${o.businessName}</strong> ${t} on Rainbow Paws.</p>
    ${o.notes?`<p><strong>Notes:</strong> ${o.notes}</p>`:""}
    <div class="button-container">
      <a href="http://localhost:3002/cremation/dashboard" class="button" style="color: white !important; text-decoration: none;">
        Go to Dashboard
      </a>
    </div>
    <p>If you have any questions, please contact our support team.</p>
  `),metadata:{businessName:o.businessName,status:o.status,emailType:r}})};e.exports={sendEmail:i,sendWelcomeEmail:c,sendPasswordResetEmail:l,sendOtpEmail:d,sendBookingConfirmationEmail:p,sendBusinessVerificationEmail:u}},28303:e=>{function o(e){var o=Error("Cannot find module '"+e+"'");throw o.code="MODULE_NOT_FOUND",o}o.keys=()=>[],o.resolve=o,o.id=28303,e.exports=o},78335:()=>{},96487:()=>{}};