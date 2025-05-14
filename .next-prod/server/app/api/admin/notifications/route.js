(()=>{var e={};e.id=6962,e.ids=[6962],e.modules={3295:e=>{"use strict";e.exports=require("next/dist/server/app-render/after-task-async-storage.external.js")},5069:(e,t,r)=>{"use strict";let s;r.r(t),r.d(t,{default:()=>l,query:()=>c,testConnection:()=>u});var o=r(46101);let a=(e,t)=>{},n={host:"localhost",user:"root",database:"rainbow_paws",port:3306};a("Database configuration in db.ts:",{host:n.host,user:n.user,port:n.port,database:n.database});let i={host:"localhost",user:"root",password:"",database:"rainbow_paws",port:3306,waitForConnections:!0,connectionLimit:10,queueLimit:0,socketPath:void 0,insecureAuth:!0};a("Final database configuration:",{host:i.host,user:i.user,port:i.port,database:i.database,environment:"production"});try{a("Attempting to create MySQL connection pool with config:",{host:i.host,user:i.user,database:i.database,port:i.port}),s=o.createPool(i),a("MySQL connection pool created successfully"),(async()=>{try{let e=await s.getConnection();a("Successfully got a test connection from the pool"),e.release(),a("Test connection released back to pool")}catch(e){console.error("Failed to get a test connection from the pool:",e)}})()}catch(e){console.error("Error creating MySQL connection pool:",e),console.error("Error details:",e.message),"ECONNREFUSED"===e.code?console.error("Connection refused. Make sure MySQL is running on port 3306."):"ER_ACCESS_DENIED_ERROR"===e.code?console.error("Access denied. Check your MySQL username and password."):"ER_BAD_DB_ERROR"===e.code&&console.error("Database does not exist. Make sure the database name is correct."),a("Creating fallback MySQL connection pool with default values");try{s=o.createPool(i),a("Fallback pool created successfully")}catch(e){console.error("Failed to create fallback pool:",e),s=o.createPool({host:"localhost",user:"root",password:"",database:"rainbow_paws",port:3306})}}async function c(e,t=[]){try{let r=await s.getConnection();a("Got connection from pool");try{let[s]=await r.query(e,t);return s}finally{r.release(),a("Connection released back to pool")}}catch(r){if(console.error("Database query error:",r),console.error("Failed query:",e),console.error("Query parameters:",t),"ECONNREFUSED"===r.code)console.error("Database connection refused. Make sure MySQL is running and accessible."),console.error("Current connection settings:",{host:n.host,port:n.port,user:n.user,database:n.database});else if("ER_ACCESS_DENIED_ERROR"===r.code)console.error("Access denied. Check your username and password.");else if("ER_BAD_DB_ERROR"===r.code)console.error("Database does not exist. Make sure the database name is correct.");else if("PROTOCOL_CONNECTION_LOST"===r.code){console.error("Database connection was closed. Trying to reconnect...");try{s=o.createPool(i),console.log("Reconnected to MySQL successfully")}catch(e){console.error("Failed to reconnect to MySQL:",e)}}throw r}}async function u(){try{a("Testing database connection..."),await c("SELECT 1 as test"),a("Database connection test successful");try{a("Checking users table...");let e=await c("SELECT COUNT(*) as count FROM users");a(`Users table has ${e[0].count} records`)}catch(e){console.error("Error checking users table:",e.message)}return!0}catch(e){console.error("Database connection test failed:",e);try{a("Trying direct connection without pool...");let e=await o.createConnection({host:i.host,user:i.user,password:i.password,port:3306,database:i.database});return a("Direct connection successful"),await e.end(),a("Direct connection closed"),s=o.createPool(i),a("Connection pool recreated"),!0}catch(e){return console.error("Direct connection failed:",e),!1}}}let l=s},10846:e=>{"use strict";e.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},19771:e=>{"use strict";e.exports=require("process")},27910:e=>{"use strict";e.exports=require("stream")},28303:e=>{function t(e){var t=Error("Cannot find module '"+e+"'");throw t.code="MODULE_NOT_FOUND",t}t.keys=()=>[],t.resolve=t,t.id=28303,e.exports=t},28354:e=>{"use strict";e.exports=require("util")},29294:e=>{"use strict";e.exports=require("next/dist/server/app-render/work-async-storage.external.js")},34631:e=>{"use strict";e.exports=require("tls")},41204:e=>{"use strict";e.exports=require("string_decoder")},44870:e=>{"use strict";e.exports=require("next/dist/compiled/next-server/app-route.runtime.prod.js")},55511:e=>{"use strict";e.exports=require("crypto")},63033:e=>{"use strict";e.exports=require("next/dist/server/app-render/work-unit-async-storage.external.js")},66136:e=>{"use strict";e.exports=require("timers")},74075:e=>{"use strict";e.exports=require("zlib")},74431:(e,t,r)=>{"use strict";r.d(t,{Xc:()=>s});let s=e=>{let t=e.headers.get("cookie");if(!t)return null;let r=t.split(";").find(e=>e.trim().startsWith("auth_token="));if(!r)return null;let s=r.split("=")[1];if(!s)return null;try{let e=decodeURIComponent(s);if(!e||!e.includes("_"))return null;return e}catch(e){return null}}},78335:()=>{},79428:e=>{"use strict";e.exports=require("buffer")},79551:e=>{"use strict";e.exports=require("url")},84062:(e,t,r)=>{"use strict";r.r(t),r.d(t,{patchFetch:()=>R,routeModule:()=>p,serverHooks:()=>_,workAsyncStorage:()=>E,workUnitAsyncStorage:()=>f});var s={};r.r(s),r.d(s,{GET:()=>l,POST:()=>d});var o=r(96559),a=r(48088),n=r(37719),i=r(32190),c=r(5069),u=r(74431);async function l(e){try{let t=!1,r="",s=(0,u.Xc)(e);if(console.log("Auth token:",s?"Present":"Missing"),s){let e=s.split("_");2===e.length&&(r=e[1],t="admin"===r)}if(!t)return i.NextResponse.json({error:"Unauthorized",details:"Admin access required",success:!1},{status:401});let o=await (0,c.query)(`
      SELECT COUNT(*) as count
      FROM information_schema.tables
      WHERE table_schema = ? AND table_name = 'admin_notifications'
    `,["rainbow_paws"]);o&&Array.isArray(o)&&o[0]&&o[0].count>0||(await (0,c.query)(`
        CREATE TABLE admin_notifications (
          id INT AUTO_INCREMENT PRIMARY KEY,
          type VARCHAR(50) NOT NULL,
          title VARCHAR(255) NOT NULL,
          message TEXT NOT NULL,
          entity_type VARCHAR(50),
          entity_id INT,
          link VARCHAR(255),
          is_read BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `),console.log("Created admin_notifications table"));let a=await (0,c.query)(`
      SELECT * FROM admin_notifications
      WHERE is_read = FALSE
      ORDER BY created_at DESC
      LIMIT 50
    `),n=(await (0,c.query)(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = DATABASE()
      AND table_name IN ('business_profiles', 'service_providers')
    `)).map(e=>e.table_name).includes("service_providers");console.log(`Using ${n?"service_providers":"business_profiles"} table for pending applications`);let l=0;if(n){let e=await (0,c.query)(`
        SELECT COUNT(*) as count
        FROM service_providers
        WHERE verification_status = 'pending'
      `);l=e&&e[0]?e[0].count:0}else{let e=await (0,c.query)(`
        SELECT COUNT(*) as count
        FROM business_profiles
        WHERE verification_status IS NULL OR verification_status = 'pending'
      `);l=e&&e[0]?e[0].count:0}if(l>0){let e=await (0,c.query)(`
        SELECT * FROM admin_notifications
        WHERE type = 'pending_application' AND is_read = FALSE
        LIMIT 1
      `);if(!e||0===e.length){await (0,c.query)(`
          INSERT INTO admin_notifications (type, title, message, entity_type, link)
          VALUES (?, ?, ?, ?, ?)
        `,["pending_application","Pending Applications",`You have ${l} pending business application${l>1?"s":""} to review.`,n?"service_provider":"business_profile","/admin/applications"]);let e=await (0,c.query)(`
          SELECT * FROM admin_notifications
          WHERE is_read = FALSE
          ORDER BY created_at DESC
          LIMIT 50
        `);return i.NextResponse.json({success:!0,notifications:e,pendingApplications:l})}}return i.NextResponse.json({success:!0,notifications:a,pendingApplications:l})}catch(e){return console.error("Error fetching admin notifications:",e),i.NextResponse.json({error:"Failed to fetch notifications",details:e instanceof Error?e.message:"Unknown error",success:!1},{status:500})}}async function d(e){try{let t=!1,r="",s=(0,u.Xc)(e);if(s){let e=s.split("_");2===e.length&&(r=e[1],t="admin"===r)}if(!t)return i.NextResponse.json({error:"Unauthorized",details:"Admin access required",success:!1},{status:401});let{notificationIds:o,markAll:a,type:n}=await e.json();if(a)n?await (0,c.query)(`
          UPDATE admin_notifications
          SET is_read = TRUE
          WHERE type = ?
        `,[n]):await (0,c.query)(`
          UPDATE admin_notifications
          SET is_read = TRUE
        `);else{if(!(o&&Array.isArray(o))||!(o.length>0))return i.NextResponse.json({error:"Invalid request",details:"Please provide notificationIds or set markAll to true",success:!1},{status:400});await (0,c.query)(`
        UPDATE admin_notifications
        SET is_read = TRUE
        WHERE id IN (?)
      `,[o])}return i.NextResponse.json({success:!0,message:"Notifications marked as read"})}catch(e){return console.error("Error marking notifications as read:",e),i.NextResponse.json({error:"Failed to mark notifications as read",details:e instanceof Error?e.message:"Unknown error",success:!1},{status:500})}}let p=new o.AppRouteRouteModule({definition:{kind:a.RouteKind.APP_ROUTE,page:"/api/admin/notifications/route",pathname:"/api/admin/notifications",filename:"route",bundlePath:"app/api/admin/notifications/route"},resolvedPagePath:"C:\\xampp\\htdocs\\app_rainbowpaws\\src\\app\\api\\admin\\notifications\\route.ts",nextConfigOutput:"standalone",userland:s}),{workAsyncStorage:E,workUnitAsyncStorage:f,serverHooks:_}=p;function R(){return(0,n.patchFetch)({workAsyncStorage:E,workUnitAsyncStorage:f})}},91645:e=>{"use strict";e.exports=require("net")},94735:e=>{"use strict";e.exports=require("events")},96487:()=>{}};var t=require("../../../../webpack-runtime.js");t.C(e);var r=e=>t(t.s=e),s=t.X(0,[4447,580,6101],()=>r(84062));module.exports=s})();