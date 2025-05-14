(()=>{var e={};e.id=3706,e.ids=[3706],e.modules={3295:e=>{"use strict";e.exports=require("next/dist/server/app-render/after-task-async-storage.external.js")},5069:(e,r,s)=>{"use strict";let t;s.r(r),s.d(r,{default:()=>d,query:()=>c,testConnection:()=>p});var a=s(46101);let o=(e,r)=>{},i={host:"localhost",user:"root",database:"rainbow_paws",port:3306};o("Database configuration in db.ts:",{host:i.host,user:i.user,port:i.port,database:i.database});let n={host:"localhost",user:"root",password:"",database:"rainbow_paws",port:3306,waitForConnections:!0,connectionLimit:10,queueLimit:0,socketPath:void 0,insecureAuth:!0};o("Final database configuration:",{host:n.host,user:n.user,port:n.port,database:n.database,environment:"production"});try{o("Attempting to create MySQL connection pool with config:",{host:n.host,user:n.user,database:n.database,port:n.port}),t=a.createPool(n),o("MySQL connection pool created successfully"),(async()=>{try{let e=await t.getConnection();o("Successfully got a test connection from the pool"),e.release(),o("Test connection released back to pool")}catch(e){console.error("Failed to get a test connection from the pool:",e)}})()}catch(e){console.error("Error creating MySQL connection pool:",e),console.error("Error details:",e.message),"ECONNREFUSED"===e.code?console.error("Connection refused. Make sure MySQL is running on port 3306."):"ER_ACCESS_DENIED_ERROR"===e.code?console.error("Access denied. Check your MySQL username and password."):"ER_BAD_DB_ERROR"===e.code&&console.error("Database does not exist. Make sure the database name is correct."),o("Creating fallback MySQL connection pool with default values");try{t=a.createPool(n),o("Fallback pool created successfully")}catch(e){console.error("Failed to create fallback pool:",e),t=a.createPool({host:"localhost",user:"root",password:"",database:"rainbow_paws",port:3306})}}async function c(e,r=[]){try{let s=await t.getConnection();o("Got connection from pool");try{let[t]=await s.query(e,r);return t}finally{s.release(),o("Connection released back to pool")}}catch(s){if(console.error("Database query error:",s),console.error("Failed query:",e),console.error("Query parameters:",r),"ECONNREFUSED"===s.code)console.error("Database connection refused. Make sure MySQL is running and accessible."),console.error("Current connection settings:",{host:i.host,port:i.port,user:i.user,database:i.database});else if("ER_ACCESS_DENIED_ERROR"===s.code)console.error("Access denied. Check your username and password.");else if("ER_BAD_DB_ERROR"===s.code)console.error("Database does not exist. Make sure the database name is correct.");else if("PROTOCOL_CONNECTION_LOST"===s.code){console.error("Database connection was closed. Trying to reconnect...");try{t=a.createPool(n),console.log("Reconnected to MySQL successfully")}catch(e){console.error("Failed to reconnect to MySQL:",e)}}throw s}}async function p(){try{o("Testing database connection..."),await c("SELECT 1 as test"),o("Database connection test successful");try{o("Checking users table...");let e=await c("SELECT COUNT(*) as count FROM users");o(`Users table has ${e[0].count} records`)}catch(e){console.error("Error checking users table:",e.message)}return!0}catch(e){console.error("Database connection test failed:",e);try{o("Trying direct connection without pool...");let e=await a.createConnection({host:n.host,user:n.user,password:n.password,port:3306,database:n.database});return o("Direct connection successful"),await e.end(),o("Direct connection closed"),t=a.createPool(n),o("Connection pool recreated"),!0}catch(e){return console.error("Direct connection failed:",e),!1}}}let d=t},6501:(e,r,s)=>{"use strict";s.r(r),s.d(r,{patchFetch:()=>v,routeModule:()=>d,serverHooks:()=>_,workAsyncStorage:()=>l,workUnitAsyncStorage:()=>u});var t={};s.r(t),s.d(t,{GET:()=>p});var a=s(96559),o=s(48088),i=s(37719),n=s(32190),c=s(5069);async function p(){try{console.log("Fetching service providers from database - Enhanced version with application_status support");try{let e,r=(await (0,c.query)(`
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = DATABASE()
        AND table_name IN ('business_profiles', 'service_providers')
      `)).map(e=>e.table_name);console.log("Available tables:",r);let s=r.includes("service_providers"),t=r.includes("business_profiles");if(!s&&!t)throw console.error("Neither business_profiles nor service_providers table exists in the database"),Error("Database schema error: Required tables do not exist");if(s){let r=(await (0,c.query)(`
          SELECT COLUMN_NAME 
          FROM INFORMATION_SCHEMA.COLUMNS 
          WHERE TABLE_SCHEMA = DATABASE() 
          AND TABLE_NAME = 'service_providers'
        `)).map(e=>e.COLUMN_NAME),s=r.includes("application_status"),t=r.includes("verification_status"),a=r.includes("status");console.log("Service providers table columns:",{hasApplicationStatus:s,hasVerificationStatus:t,hasStatus:a});let o="";o=s?"(application_status = 'approved' OR application_status = 'verified')":t?"verification_status = 'verified'":"1=1",r.includes("provider_type")&&(o+=" AND provider_type = 'cremation'"),a&&(o+=" AND status = 'active'"),console.log("Using service_providers table with WHERE clause:",o),e=await (0,c.query)(`
          SELECT
            id,
            name,
            city,
            address,
            phone,
            service_description as description,
            provider_type as type,
            created_at,
            ${s?"application_status":t?"verification_status":"'approved' as application_status"}
          FROM service_providers
          WHERE ${o}
          ORDER BY name ASC
        `),console.log(`Found ${e.length} providers matching the criteria:`),e.length>0&&e.forEach(e=>{console.log(`- [ID: ${e.id}] ${e.name} (${s?e.application_status:t?e.verification_status:"unknown status"})`)})}else console.log("Using business_profiles table"),e=[];if(e&&e.length>0){for(let r of(console.log(`Found ${e.length} service providers in service_providers table`),e))try{let e,s=(await (0,c.query)(`
              SHOW COLUMNS FROM service_packages
              WHERE Field IN ('service_provider_id', 'provider_id')
            `)).map(e=>e.Field),t=s.includes("service_provider_id"),a=s.includes("provider_id");t?e=await (0,c.query)(`
                SELECT COUNT(*) as package_count
                FROM service_packages
                WHERE service_provider_id = ? AND is_active = TRUE
              `,[r.id]):a?e=await (0,c.query)(`
                SELECT COUNT(*) as package_count
                FROM service_packages
                WHERE provider_id = ? AND is_active = TRUE
              `,[r.id]):(console.error("service_packages table missing required columns"),e=[{package_count:0}]),r.packages=e[0]?.package_count||0;let o=(1.5*r.id%30).toFixed(1);r.distance=`${o} km away`,r.distanceValue=parseFloat(o)}catch(e){console.error(`Error fetching packages for provider ${r.id}:`,e),r.packages=0,r.distance="Distance unavailable"}return n.NextResponse.json({providers:e})}console.log("No results from previous query, trying business_profiles");let a=[];if(t){let e=(await (0,c.query)(`
          SELECT COLUMN_NAME 
          FROM INFORMATION_SCHEMA.COLUMNS 
          WHERE TABLE_SCHEMA = DATABASE() 
          AND TABLE_NAME = 'business_profiles'
        `)).map(e=>e.COLUMN_NAME),r=e.includes("application_status"),s=e.includes("verification_status"),t="";t=r?"(bp.application_status = 'approved' OR bp.application_status = 'verified')":s?"bp.verification_status = 'verified'":"1=1",a=await (0,c.query)(`
          SELECT
            bp.id,
            bp.business_name as name,
            bp.city,
            bp.business_address as address,
            bp.business_phone as phone,
            u.email,
            bp.service_description as description,
            bp.business_type,
            bp.created_at
          FROM business_profiles bp
          JOIN users u ON bp.user_id = u.id
          WHERE ${t}
          AND bp.business_type = 'cremation'
          ORDER BY bp.business_name ASC
        `)}if(a&&a.length>0){console.log(`Found ${a.length} cremation businesses in business_profiles table`);let e=a.map(e=>{let r=e.address?e.address.includes("2100")?e.address:e.address.replace("Philippines","2100 Philippines"):"";return{id:e.id,name:e.name,city:r?r.split(",")[0]:e.city||"Bataan",address:r,phone:e.phone,email:e.email,description:e.description||"Pet cremation services",type:"Pet Cremation Services",packages:0,distance:`${(1.5*e.id%30).toFixed(1)} km away`,created_at:e.created_at}});for(let r of e)try{let e,s=(await (0,c.query)(`
              SHOW COLUMNS FROM service_packages
              WHERE Field IN ('service_provider_id', 'provider_id', 'business_id')
            `)).map(e=>e.Field),t=s.includes("service_provider_id"),a=s.includes("provider_id"),o=s.includes("business_id");t?e=await (0,c.query)(`
                SELECT COUNT(*) as package_count
                FROM service_packages
                WHERE service_provider_id = ? AND is_active = TRUE
              `,[r.id]):a?e=await (0,c.query)(`
                SELECT COUNT(*) as package_count
                FROM service_packages
                WHERE provider_id = ? AND is_active = TRUE
              `,[r.id]):o?e=await (0,c.query)(`
                SELECT COUNT(*) as package_count
                FROM service_packages
                WHERE business_id = ? AND is_active = TRUE
              `,[r.id]):(console.error("service_packages table missing required columns"),e=[{package_count:0}]),r.packages=e[0]?.package_count||0}catch(e){console.error(`Error fetching packages for business ${r.id}:`,e)}return n.NextResponse.json({providers:e})}console.log("No providers found in any table, creating test providers");let o=[{id:1001,name:"Rainbow Bridge Pet Cremation",city:"Balanga City, Bataan",address:"Capitol Drive, Balanga City, Bataan, 2100 Philippines",phone:"(123) 456-7890",email:"info@rainbowbridge.com",description:"Compassionate pet cremation services with personalized memorials.",type:"Pet Cremation Services",packages:3,distance:"5.5 km away",distanceValue:5.5,created_at:new Date().toISOString()},{id:1002,name:"Peaceful Paws Memorial",city:"Orani, Bataan",address:"National Road, Orani, Bataan, 2112 Philippines",phone:"(234) 567-8901",email:"care@peacefulpaws.com",description:"Dignified pet cremation with eco-friendly options.",type:"Pet Cremation Services",packages:2,distance:"12.3 km away",distanceValue:12.3,created_at:new Date().toISOString()},{id:1003,name:"Forever Friends Pet Services",city:"Dinalupihan, Bataan",address:"San Ramon Highway, Dinalupihan, Bataan, 2110 Philippines",phone:"(345) 678-9012",email:"service@foreverfriends.com",description:"Comprehensive pet memorial services with home pickup options.",type:"Pet Cremation Services",packages:4,distance:"18.7 km away",distanceValue:18.7,created_at:new Date().toISOString()}];return n.NextResponse.json({providers:o})}catch(e){return console.error("Database error fetching service providers:",e),n.NextResponse.json({providers:[],error:"Database error"})}}catch(e){return console.error("Error fetching service providers:",e),n.NextResponse.json({error:"Failed to fetch service providers"},{status:500})}}let d=new a.AppRouteRouteModule({definition:{kind:o.RouteKind.APP_ROUTE,page:"/api/service-providers/route",pathname:"/api/service-providers",filename:"route",bundlePath:"app/api/service-providers/route"},resolvedPagePath:"C:\\xampp\\htdocs\\app_rainbowpaws\\src\\app\\api\\service-providers\\route.ts",nextConfigOutput:"standalone",userland:t}),{workAsyncStorage:l,workUnitAsyncStorage:u,serverHooks:_}=d;function v(){return(0,i.patchFetch)({workAsyncStorage:l,workUnitAsyncStorage:u})}},10846:e=>{"use strict";e.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},19771:e=>{"use strict";e.exports=require("process")},27910:e=>{"use strict";e.exports=require("stream")},28303:e=>{function r(e){var r=Error("Cannot find module '"+e+"'");throw r.code="MODULE_NOT_FOUND",r}r.keys=()=>[],r.resolve=r,r.id=28303,e.exports=r},28354:e=>{"use strict";e.exports=require("util")},29294:e=>{"use strict";e.exports=require("next/dist/server/app-render/work-async-storage.external.js")},34631:e=>{"use strict";e.exports=require("tls")},41204:e=>{"use strict";e.exports=require("string_decoder")},44870:e=>{"use strict";e.exports=require("next/dist/compiled/next-server/app-route.runtime.prod.js")},55511:e=>{"use strict";e.exports=require("crypto")},63033:e=>{"use strict";e.exports=require("next/dist/server/app-render/work-unit-async-storage.external.js")},66136:e=>{"use strict";e.exports=require("timers")},74075:e=>{"use strict";e.exports=require("zlib")},78335:()=>{},79428:e=>{"use strict";e.exports=require("buffer")},79551:e=>{"use strict";e.exports=require("url")},91645:e=>{"use strict";e.exports=require("net")},94735:e=>{"use strict";e.exports=require("events")},96487:()=>{}};var r=require("../../../webpack-runtime.js");r.C(e);var s=e=>r(r.s=e),t=r.X(0,[4447,580,6101],()=>s(6501));module.exports=t})();