(()=>{var e={};e.id=9548,e.ids=[9548],e.modules={3295:e=>{"use strict";e.exports=require("next/dist/server/app-render/after-task-async-storage.external.js")},5069:(e,r,t)=>{"use strict";let o;t.r(r),t.d(r,{default:()=>l,query:()=>i,testConnection:()=>u});var s=t(46101);let a=(e,r)=>{},n={host:"localhost",user:"root",database:"rainbow_paws",port:3306};a("Database configuration in db.ts:",{host:n.host,user:n.user,port:n.port,database:n.database});let c={host:"localhost",user:"root",password:"",database:"rainbow_paws",port:3306,waitForConnections:!0,connectionLimit:10,queueLimit:0,socketPath:void 0,insecureAuth:!0};a("Final database configuration:",{host:c.host,user:c.user,port:c.port,database:c.database,environment:"production"});try{a("Attempting to create MySQL connection pool with config:",{host:c.host,user:c.user,database:c.database,port:c.port}),o=s.createPool(c),a("MySQL connection pool created successfully"),(async()=>{try{let e=await o.getConnection();a("Successfully got a test connection from the pool"),e.release(),a("Test connection released back to pool")}catch(e){console.error("Failed to get a test connection from the pool:",e)}})()}catch(e){console.error("Error creating MySQL connection pool:",e),console.error("Error details:",e.message),"ECONNREFUSED"===e.code?console.error("Connection refused. Make sure MySQL is running on port 3306."):"ER_ACCESS_DENIED_ERROR"===e.code?console.error("Access denied. Check your MySQL username and password."):"ER_BAD_DB_ERROR"===e.code&&console.error("Database does not exist. Make sure the database name is correct."),a("Creating fallback MySQL connection pool with default values");try{o=s.createPool(c),a("Fallback pool created successfully")}catch(e){console.error("Failed to create fallback pool:",e),o=s.createPool({host:"localhost",user:"root",password:"",database:"rainbow_paws",port:3306})}}async function i(e,r=[]){try{let t=await o.getConnection();a("Got connection from pool");try{let[o]=await t.query(e,r);return o}finally{t.release(),a("Connection released back to pool")}}catch(t){if(console.error("Database query error:",t),console.error("Failed query:",e),console.error("Query parameters:",r),"ECONNREFUSED"===t.code)console.error("Database connection refused. Make sure MySQL is running and accessible."),console.error("Current connection settings:",{host:n.host,port:n.port,user:n.user,database:n.database});else if("ER_ACCESS_DENIED_ERROR"===t.code)console.error("Access denied. Check your username and password.");else if("ER_BAD_DB_ERROR"===t.code)console.error("Database does not exist. Make sure the database name is correct.");else if("PROTOCOL_CONNECTION_LOST"===t.code){console.error("Database connection was closed. Trying to reconnect...");try{o=s.createPool(c),console.log("Reconnected to MySQL successfully")}catch(e){console.error("Failed to reconnect to MySQL:",e)}}throw t}}async function u(){try{a("Testing database connection..."),await i("SELECT 1 as test"),a("Database connection test successful");try{a("Checking users table...");let e=await i("SELECT COUNT(*) as count FROM users");a(`Users table has ${e[0].count} records`)}catch(e){console.error("Error checking users table:",e.message)}return!0}catch(e){console.error("Database connection test failed:",e);try{a("Trying direct connection without pool...");let e=await s.createConnection({host:c.host,user:c.user,password:c.password,port:3306,database:c.database});return a("Direct connection successful"),await e.end(),a("Direct connection closed"),o=s.createPool(c),a("Connection pool recreated"),!0}catch(e){return console.error("Direct connection failed:",e),!1}}}let l=o},5856:(e,r,t)=>{"use strict";t.r(r),t.d(r,{patchFetch:()=>_,routeModule:()=>d,serverHooks:()=>v,workAsyncStorage:()=>E,workUnitAsyncStorage:()=>h});var o={};t.r(o),t.d(o,{GET:()=>p});var s=t(96559),a=t(48088),n=t(37719),c=t(32190),i=t(5069),u=t(74431);let l={totalUsers:{count:0,change:"0",changeType:"neutral"},applications:{count:0,change:"0",changeType:"neutral"},services:{count:0,change:"0",changeType:"neutral"},revenue:{amount:0,change:"0",changeType:"neutral"},activeUsers:{cremation:0,furparent:0},pendingApplications:{current_month:0,last_month:0},restrictedUsers:{cremation:0,furparent:0}};async function p(e){try{let r=(0,u.Xc)(e);if(!r)return c.NextResponse.json({error:"Unauthorized"},{status:401});{let[e,t]=r.split("_");if("admin"!==t)return c.NextResponse.json({error:"Unauthorized - Admin access required"},{status:403})}console.log("Fetching admin dashboard statistics...");try{try{let e=await (0,i.query)("SELECT 1 as connected");if(!e||!e[0]||1!==e[0].connected)throw console.error("Database connection check failed"),Error("Database connection failed")}catch(e){return console.error("Database connection error:",e),c.NextResponse.json({success:!0,stats:l,error:"Database connection error"})}let e=new Date,r=new Date;r.setDate(e.getDate()-30),r.toISOString().split("T")[0];let t={users:!1,serviceProviders:!1,servicePackages:!1,bookings:!1};try{(await (0,i.query)(`
          SELECT table_name 
          FROM information_schema.tables 
          WHERE table_schema = DATABASE() 
          AND table_name IN ('users', 'service_providers', 'service_packages', 'bookings')
        `)).forEach(e=>{"users"===e.table_name&&(t.users=!0),"service_providers"===e.table_name&&(t.serviceProviders=!0),"service_packages"===e.table_name&&(t.servicePackages=!0),"bookings"===e.table_name&&(t.bookings=!0)})}catch(e){console.error("Error checking available tables:",e)}console.log("Available tables:",t);let o=0;if(t.users)try{let e=await (0,i.query)("SELECT COUNT(*) as count FROM users");o=e[0]?.count||0}catch(e){console.error("Error counting users:",e)}let s=0;if(t.serviceProviders)try{let e=await (0,i.query)("SELECT COUNT(*) as count FROM service_providers");s=e[0]?.count||0}catch(e){console.error("Error counting service providers:",e)}let a=0;if(t.servicePackages)try{let e=await (0,i.query)(`
            SELECT COUNT(*) as count 
            FROM service_packages 
            WHERE is_active = 1
          `);if(a=e[0]?.count||0,t.serviceProviders)try{let e=await (0,i.query)(`
                SELECT COUNT(*) as count 
                FROM service_packages sp
                JOIN service_providers p ON sp.service_provider_id = p.id
                WHERE (p.application_status = 'approved' OR p.application_status = 'verified')
                AND sp.is_active = 1
              `);e&&e[0]&&(a=e[0].count||0,console.log("Found active services for approved cremation centers:",a))}catch(e){console.error("Error counting active services for approved centers:",e)}}catch(e){console.error("Error counting service packages:",e);try{let e=await (0,i.query)(`
              SELECT COUNT(*) as count 
              FROM service_packages
            `);a=e[0]?.count||0}catch(e){console.error("Fallback error counting service packages:",e)}}let n=0;if(t.bookings)try{let e=await (0,i.query)('SELECT SUM(total_amount) as total FROM bookings WHERE status = "completed"');n=e[0]?.total||0}catch(e){console.error("Error calculating revenue:",e)}let u={cremation:0,furparent:0};if(t.serviceProviders){let e=!1;try{e=(await (0,i.query)(`
            SHOW COLUMNS FROM service_providers LIKE 'application_status'
          `)).length>0}catch(e){console.error("Error checking application_status column:",e)}try{if(e){let e=await (0,i.query)(`
              SELECT COUNT(*) as count 
              FROM service_providers 
              WHERE application_status = 'approved' OR application_status = 'verified'
            `);u.cremation=e[0]?.count||0}else{let e=await (0,i.query)(`
              SELECT COUNT(*) as count 
              FROM service_providers 
              WHERE verification_status = 'verified'
            `);u.cremation=e[0]?.count||0}}catch(e){console.error("Error counting active cremation centers:",e)}}if(t.users)try{let e=await (0,i.query)(`
            SELECT COUNT(*) as count 
            FROM users 
            WHERE role = 'fur_parent' AND is_verified = 1
          `);u.furparent=e[0]?.count||0}catch(e){console.error("Error counting active fur parents:",e)}let p={current_month:0,last_month:0};if(t.serviceProviders){let e=!1;try{e=(await (0,i.query)(`
            SHOW COLUMNS FROM service_providers LIKE 'application_status'
          `)).length>0}catch(e){console.error("Error checking application_status column:",e)}try{if(e){let e=await (0,i.query)(`
              SELECT COUNT(*) as count 
              FROM service_providers 
              WHERE application_status = 'pending' 
              AND MONTH(created_at) = MONTH(CURRENT_DATE()) 
              AND YEAR(created_at) = YEAR(CURRENT_DATE())
            `);p.current_month=e[0]?.count||0;let r=await (0,i.query)(`
              SELECT COUNT(*) as count 
              FROM service_providers 
              WHERE application_status = 'pending' 
              AND MONTH(created_at) = MONTH(DATE_SUB(CURRENT_DATE(), INTERVAL 1 MONTH)) 
              AND YEAR(created_at) = YEAR(DATE_SUB(CURRENT_DATE(), INTERVAL 1 MONTH))
            `);p.last_month=r[0]?.count||0}else{let e=await (0,i.query)(`
              SELECT COUNT(*) as count 
              FROM service_providers 
              WHERE verification_status = 'pending' 
              AND MONTH(created_at) = MONTH(CURRENT_DATE()) 
              AND YEAR(created_at) = YEAR(CURRENT_DATE())
            `);p.current_month=e[0]?.count||0;let r=await (0,i.query)(`
              SELECT COUNT(*) as count 
              FROM service_providers 
              WHERE verification_status = 'pending' 
              AND MONTH(created_at) = MONTH(DATE_SUB(CURRENT_DATE(), INTERVAL 1 MONTH)) 
              AND YEAR(created_at) = YEAR(DATE_SUB(CURRENT_DATE(), INTERVAL 1 MONTH))
            `);p.last_month=r[0]?.count||0}}catch(e){console.error("Error counting pending applications:",e)}}let d={cremation:0,furparent:0};if(t.serviceProviders)try{let e=!1;try{e=(await (0,i.query)(`
              SHOW COLUMNS FROM service_providers LIKE 'application_status'
            `)).length>0}catch(e){console.error("Error checking application_status column:",e)}if(e){let e=await (0,i.query)(`
              SELECT COUNT(*) as count 
              FROM service_providers 
              WHERE application_status = 'restricted'
            `);d.cremation=e[0]?.count||0}else{let e=await (0,i.query)(`
              SELECT COUNT(*) as count 
              FROM service_providers 
              WHERE verification_status = 'restricted'
            `);d.cremation=e[0]?.count||0}}catch(e){console.error("Error counting restricted cremation centers:",e)}if(t.users)try{let e=await (0,i.query)(`
            SELECT COUNT(*) as count 
            FROM users 
            WHERE role = 'fur_parent' AND status = 'restricted'
          `);d.furparent=e[0]?.count||0}catch(e){console.error("Error counting restricted fur parents:",e)}let E={totalUsers:{count:o,change:"0",changeType:"increase"},applications:{count:s,change:"0",changeType:"increase"},services:{count:a,change:"0",changeType:"increase"},revenue:{amount:n,change:"0",changeType:"increase"},activeUsers:u,pendingApplications:p,restrictedUsers:d};return c.NextResponse.json({success:!0,stats:E})}catch(e){return console.error("Database query error:",e),c.NextResponse.json({success:!0,stats:l,error:"Some queries failed, showing default data",details:e instanceof Error?e.message:"Unknown database error"})}}catch(e){return console.error("Error fetching admin dashboard stats:",e),c.NextResponse.json({success:!0,stats:l,error:"Failed to fetch admin dashboard statistics",details:e instanceof Error?e.message:"Unknown error"})}}let d=new s.AppRouteRouteModule({definition:{kind:a.RouteKind.APP_ROUTE,page:"/api/admin/dashboard-stats/route",pathname:"/api/admin/dashboard-stats",filename:"route",bundlePath:"app/api/admin/dashboard-stats/route"},resolvedPagePath:"C:\\xampp\\htdocs\\app_rainbowpaws\\src\\app\\api\\admin\\dashboard-stats\\route.ts",nextConfigOutput:"standalone",userland:o}),{workAsyncStorage:E,workUnitAsyncStorage:h,serverHooks:v}=d;function _(){return(0,n.patchFetch)({workAsyncStorage:E,workUnitAsyncStorage:h})}},10846:e=>{"use strict";e.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},19771:e=>{"use strict";e.exports=require("process")},27910:e=>{"use strict";e.exports=require("stream")},28303:e=>{function r(e){var r=Error("Cannot find module '"+e+"'");throw r.code="MODULE_NOT_FOUND",r}r.keys=()=>[],r.resolve=r,r.id=28303,e.exports=r},28354:e=>{"use strict";e.exports=require("util")},29294:e=>{"use strict";e.exports=require("next/dist/server/app-render/work-async-storage.external.js")},34631:e=>{"use strict";e.exports=require("tls")},41204:e=>{"use strict";e.exports=require("string_decoder")},44870:e=>{"use strict";e.exports=require("next/dist/compiled/next-server/app-route.runtime.prod.js")},55511:e=>{"use strict";e.exports=require("crypto")},63033:e=>{"use strict";e.exports=require("next/dist/server/app-render/work-unit-async-storage.external.js")},66136:e=>{"use strict";e.exports=require("timers")},74075:e=>{"use strict";e.exports=require("zlib")},74431:(e,r,t)=>{"use strict";t.d(r,{Xc:()=>o});let o=e=>{let r=e.headers.get("cookie");if(!r)return null;let t=r.split(";").find(e=>e.trim().startsWith("auth_token="));if(!t)return null;let o=t.split("=")[1];if(!o)return null;try{let e=decodeURIComponent(o);if(!e||!e.includes("_"))return null;return e}catch(e){return null}}},78335:()=>{},79428:e=>{"use strict";e.exports=require("buffer")},79551:e=>{"use strict";e.exports=require("url")},91645:e=>{"use strict";e.exports=require("net")},94735:e=>{"use strict";e.exports=require("events")},96487:()=>{}};var r=require("../../../../webpack-runtime.js");r.C(e);var t=e=>r(r.s=e),o=r.X(0,[4447,580,6101],()=>t(5856));module.exports=o})();