(()=>{var e={};e.id=7426,e.ids=[7426],e.modules={3295:e=>{"use strict";e.exports=require("next/dist/server/app-render/after-task-async-storage.external.js")},5069:(e,t,a)=>{"use strict";let r;a.r(t),a.d(t,{default:()=>l,query:()=>i,testConnection:()=>u});var s=a(46101);let o=(e,t)=>{},n={host:"localhost",user:"root",database:"rainbow_paws",port:3306};o("Database configuration in db.ts:",{host:n.host,user:n.user,port:n.port,database:n.database});let c={host:"localhost",user:"root",password:"",database:"rainbow_paws",port:3306,waitForConnections:!0,connectionLimit:10,queueLimit:0,socketPath:void 0,insecureAuth:!0};o("Final database configuration:",{host:c.host,user:c.user,port:c.port,database:c.database,environment:"production"});try{o("Attempting to create MySQL connection pool with config:",{host:c.host,user:c.user,database:c.database,port:c.port}),r=s.createPool(c),o("MySQL connection pool created successfully"),(async()=>{try{let e=await r.getConnection();o("Successfully got a test connection from the pool"),e.release(),o("Test connection released back to pool")}catch(e){console.error("Failed to get a test connection from the pool:",e)}})()}catch(e){console.error("Error creating MySQL connection pool:",e),console.error("Error details:",e.message),"ECONNREFUSED"===e.code?console.error("Connection refused. Make sure MySQL is running on port 3306."):"ER_ACCESS_DENIED_ERROR"===e.code?console.error("Access denied. Check your MySQL username and password."):"ER_BAD_DB_ERROR"===e.code&&console.error("Database does not exist. Make sure the database name is correct."),o("Creating fallback MySQL connection pool with default values");try{r=s.createPool(c),o("Fallback pool created successfully")}catch(e){console.error("Failed to create fallback pool:",e),r=s.createPool({host:"localhost",user:"root",password:"",database:"rainbow_paws",port:3306})}}async function i(e,t=[]){try{let a=await r.getConnection();o("Got connection from pool");try{let[r]=await a.query(e,t);return r}finally{a.release(),o("Connection released back to pool")}}catch(a){if(console.error("Database query error:",a),console.error("Failed query:",e),console.error("Query parameters:",t),"ECONNREFUSED"===a.code)console.error("Database connection refused. Make sure MySQL is running and accessible."),console.error("Current connection settings:",{host:n.host,port:n.port,user:n.user,database:n.database});else if("ER_ACCESS_DENIED_ERROR"===a.code)console.error("Access denied. Check your username and password.");else if("ER_BAD_DB_ERROR"===a.code)console.error("Database does not exist. Make sure the database name is correct.");else if("PROTOCOL_CONNECTION_LOST"===a.code){console.error("Database connection was closed. Trying to reconnect...");try{r=s.createPool(c),console.log("Reconnected to MySQL successfully")}catch(e){console.error("Failed to reconnect to MySQL:",e)}}throw a}}async function u(){try{o("Testing database connection..."),await i("SELECT 1 as test"),o("Database connection test successful");try{o("Checking users table...");let e=await i("SELECT COUNT(*) as count FROM users");o(`Users table has ${e[0].count} records`)}catch(e){console.error("Error checking users table:",e.message)}return!0}catch(e){console.error("Database connection test failed:",e);try{o("Trying direct connection without pool...");let e=await s.createConnection({host:c.host,user:c.user,password:c.password,port:3306,database:c.database});return o("Direct connection successful"),await e.end(),o("Direct connection closed"),r=s.createPool(c),o("Connection pool recreated"),!0}catch(e){return console.error("Direct connection failed:",e),!1}}}let l=r},8076:(e,t,a)=>{"use strict";a.r(t),a.d(t,{patchFetch:()=>T,routeModule:()=>E,serverHooks:()=>_,workAsyncStorage:()=>p,workUnitAsyncStorage:()=>d});var r={};a.r(r),a.d(r,{GET:()=>l});var s=a(96559),o=a(48088),n=a(37719),c=a(32190),i=a(5069),u=a(74431);async function l(e){try{let t=(0,u.Xc)(e);if(!t)return c.NextResponse.json({error:"Unauthorized"},{status:401});if(t){let[,e]=t.split("_");if("admin"!==e)return c.NextResponse.json({error:"Unauthorized - Admin access required"},{status:403})}let a={stats:{},recentApplications:[],userDistribution:{}},r=await (0,i.query)(`
      SELECT COUNT(*) as count FROM users
    `),s=await (0,i.query)(`
      SELECT COUNT(*) as count FROM service_providers
    `),o=await (0,i.query)(`
      SELECT COUNT(*) as count FROM service_packages WHERE is_active = 1
    `),n=await (0,i.query)(`
      SELECT COUNT(*) as count
      FROM information_schema.tables
      WHERE table_schema = DATABASE()
      AND table_name = 'successful_bookings'
    `),l=[{total:0}],E=0;if(n[0]?.count===1){l=await (0,i.query)(`
        SELECT SUM(transaction_amount) as total FROM successful_bookings
        WHERE payment_status = 'completed'
      `);let e=await (0,i.query)(`
        SELECT SUM(transaction_amount) as total FROM successful_bookings
        WHERE payment_status = 'completed'
        AND MONTH(payment_date) = MONTH(CURRENT_DATE())
        AND YEAR(payment_date) = YEAR(CURRENT_DATE())
      `);E=parseFloat(String(e[0]?.total||"0"))}else l=await (0,i.query)(`
        SELECT SUM(price) as total FROM service_packages
      `),E=parseFloat(String(l[0]?.total||"0"))/12;let p=[];try{p=(p=await (0,i.query)(`
        SELECT
          sp.id,
          sp.id as businessId,
          sp.name as businessName,
          CONCAT(u.first_name, ' ', u.last_name) as owner,
          u.email,
          sp.created_at as submitDate,
          sp.application_status as status
        FROM service_providers sp
        JOIN users u ON sp.user_id = u.id
        WHERE sp.provider_type = 'cremation'
        ORDER BY sp.created_at DESC
        LIMIT 5
      `)).map(e=>({...e,submitDate:new Date(e.submitDate).toLocaleDateString("en-US",{year:"numeric",month:"short",day:"numeric"})})),console.log(`Found ${p.length} recent applications`)}catch(e){console.error("Error fetching applications from service_providers:",e);try{console.log("Attempting fallback query for recent applications"),p=(p=await (0,i.query)(`
          SELECT
            id,
            id as businessId,
            name as businessName,
            created_at as submitDate,
            application_status as status
          FROM service_providers
          WHERE provider_type = 'cremation'
          ORDER BY created_at DESC
          LIMIT 5
        `)).map(e=>({...e,owner:"Business Owner",email:"Not available",submitDate:new Date(e.submitDate).toLocaleDateString("en-US",{year:"numeric",month:"short",day:"numeric"})})),console.log(`Found ${p.length} recent applications using fallback query`)}catch(e){console.error("Error with fallback applications query:",e),p=[]}}let d=await (0,i.query)(`
      SELECT COUNT(*) as count FROM users WHERE role = 'fur_parent'
    `),_=0,T=0;try{let e=await (0,i.query)(`
        SELECT COUNT(*) as count
        FROM information_schema.tables
        WHERE table_schema = DATABASE()
        AND table_name = 'service_providers'
      `);if(e[0]?.count===1){let e=await (0,i.query)(`
          SELECT COUNT(*) as count
          FROM information_schema.columns
          WHERE table_schema = DATABASE()
          AND table_name = 'service_providers'
          AND column_name = 'application_status'
        `);if(e[0]?.count===1){let e=await (0,i.query)(`
            SELECT COUNT(*) as count
            FROM service_providers
            WHERE application_status = 'pending'
            AND MONTH(created_at) = MONTH(CURRENT_DATE())
            AND YEAR(created_at) = YEAR(CURRENT_DATE())
          `);_=e[0]?.count||0;let t=await (0,i.query)(`
            SELECT COUNT(*) as count
            FROM service_providers
            WHERE application_status = 'pending'
            AND MONTH(created_at) = MONTH(DATE_SUB(CURRENT_DATE(), INTERVAL 1 MONTH))
            AND YEAR(created_at) = YEAR(DATE_SUB(CURRENT_DATE(), INTERVAL 1 MONTH))
          `);T=t[0]?.count||0}else{let e=await (0,i.query)(`
            SELECT COUNT(*) as count
            FROM information_schema.columns
            WHERE table_schema = DATABASE()
            AND table_name = 'service_providers'
            AND column_name = 'verification_status'
          `);if(e[0]?.count===1){let e=await (0,i.query)(`
              SELECT COUNT(*) as count
              FROM service_providers
              WHERE verification_status = 'pending'
              AND MONTH(created_at) = MONTH(CURRENT_DATE())
              AND YEAR(created_at) = YEAR(CURRENT_DATE())
            `);_=e[0]?.count||0;let t=await (0,i.query)(`
              SELECT COUNT(*) as count
              FROM service_providers
              WHERE verification_status = 'pending'
              AND MONTH(created_at) = MONTH(DATE_SUB(CURRENT_DATE(), INTERVAL 1 MONTH))
              AND YEAR(created_at) = YEAR(DATE_SUB(CURRENT_DATE(), INTERVAL 1 MONTH))
            `);T=t[0]?.count||0}}}}catch(e){console.error("Error fetching pending applications:",e)}let m=await (0,i.query)(`
      SELECT role, COUNT(*) as count
      FROM users
      WHERE status = 'restricted'
      GROUP BY role
    `),R=0;try{let e=await (0,i.query)(`
        SELECT COUNT(*) as count
        FROM information_schema.columns
        WHERE table_schema = DATABASE()
        AND table_name = 'service_providers'
        AND column_name = 'application_status'
      `);if(e[0]?.count===1){let e=await (0,i.query)(`
          SELECT COUNT(*) as count
          FROM service_providers
          WHERE application_status = 'restricted'
        `);R=e[0]?.count||0}else{let e=await (0,i.query)(`
          SELECT COUNT(*) as count
          FROM information_schema.columns
          WHERE table_schema = DATABASE()
          AND table_name = 'service_providers'
          AND column_name = 'verification_status'
        `);if(e[0]?.count===1){let e=await (0,i.query)(`
            SELECT COUNT(*) as count
            FROM service_providers
            WHERE verification_status = 'restricted'
          `);R=e[0]?.count||0}}}catch(e){console.error("Error fetching restricted cremation centers:",e)}let A=[{count:0}];try{let e=await (0,i.query)(`
        SELECT COUNT(*) as count
        FROM information_schema.columns
        WHERE table_schema = DATABASE()
        AND table_name = 'users'
        AND column_name = 'created_at'
      `);A=e[0]?.count===1?await (0,i.query)(`
          SELECT COUNT(*) as count FROM users
          WHERE created_at < DATE_SUB(CURRENT_DATE(), INTERVAL 1 MONTH)
        `):[{count:Math.floor(.8*(r[0]?.count||0))}]}catch(e){console.error("Error fetching previous month users count:",e)}let h=[{count:0}];try{let e=await (0,i.query)(`
        SELECT COUNT(*) as count
        FROM information_schema.columns
        WHERE table_schema = DATABASE()
        AND table_name = 'service_packages'
        AND column_name = 'created_at'
      `);h=e[0]?.count===1?await (0,i.query)(`
          SELECT COUNT(*) as count FROM service_packages
          WHERE created_at < DATE_SUB(CURRENT_DATE(), INTERVAL 1 MONTH) AND is_active = 1
        `):[{count:Math.floor(.7*(o[0]?.count||0))}]}catch(e){console.error("Error fetching previous month services count:",e)}let N=[{total:0}];if(n[0]?.count===1)N=await (0,i.query)(`
        SELECT SUM(transaction_amount) as total FROM successful_bookings
        WHERE payment_status = 'completed'
        AND MONTH(payment_date) = MONTH(DATE_SUB(CURRENT_DATE(), INTERVAL 1 MONTH))
        AND YEAR(payment_date) = YEAR(DATE_SUB(CURRENT_DATE(), INTERVAL 1 MONTH))
      `);else try{let e=await (0,i.query)(`
          SELECT COUNT(*) as count
          FROM information_schema.columns
          WHERE table_schema = DATABASE()
          AND table_name = 'service_packages'
          AND column_name = 'created_at'
        `);N=e[0]?.count===1?await (0,i.query)(`
            SELECT SUM(price) as total FROM service_packages
            WHERE created_at < DATE_SUB(CURRENT_DATE(), INTERVAL 1 MONTH)
          `):[{total:.75*parseFloat(String(l[0]?.total||"0"))}]}catch(e){console.error("Error fetching previous month revenue:",e)}let y=(e,t)=>{if(0===t)return{value:"+100%",type:"increase"};let a=(e-t)/t*100;return{value:`${a>0?"+":""}${Math.abs(Math.round(a))}%`,type:a>=0?"increase":"decrease"}},C=r[0]?.count||0,D=A[0]?.count||0,O=y(C,D),b=o[0]?.count||0,f=h[0]?.count||0,S=y(b,f),v=parseFloat(String(l[0]?.total||"0")),M=parseFloat(String(N[0]?.total||"0")),g=y(v,M),U=[{count:0}];try{let e=await (0,i.query)(`
        SELECT COUNT(*) as count
        FROM information_schema.tables
        WHERE table_schema = DATABASE()
        AND table_name = 'business_applications'
      `);if(e[0]?.count===1){let e=await (0,i.query)(`
          SELECT COUNT(*) as count
          FROM information_schema.columns
          WHERE table_schema = DATABASE()
          AND table_name = 'business_applications'
          AND column_name = 'created_at'
        `);e[0]?.count===1&&(U=await (0,i.query)(`
            SELECT COUNT(*) as count FROM business_applications
            WHERE created_at < DATE_SUB(CURRENT_DATE(), INTERVAL 1 MONTH)
          `))}}catch(e){console.error("Error fetching previous month applications:",e)}let w=p.length,L=U[0]?.count||0,q=y(w,L);a.stats={totalUsers:{value:C,change:O.value,changeType:O.type},applicationRequests:{value:w,change:q.value,changeType:q.type},activeServices:{value:b,change:S.value,changeType:S.type},monthlyRevenue:{value:E>0?`₱${Math.round(E).toLocaleString()}`:`₱0`,change:g.value,changeType:g.type,isEstimate:E<=0}},a.recentApplications=p;let F=d[0]?.count||0,H=s[0]?.count||0,k=(m.find(e=>"fur_parent"===e.role)?.count||0)+(m.find(e=>"user"===e.role)?.count||0);return a.userDistribution={activeUsers:{cremationCenters:H,furParents:F},pendingApplications:{thisMonth:_,lastMonth:T},restrictedUsers:{cremationCenters:R,furParents:k||0}},c.NextResponse.json({success:!0,data:a})}catch(e){return console.error("Error fetching dashboard data:",e),c.NextResponse.json({error:"Failed to fetch dashboard data",details:e instanceof Error?e.message:"Unknown error",success:!1},{status:500})}}let E=new s.AppRouteRouteModule({definition:{kind:o.RouteKind.APP_ROUTE,page:"/api/admin/dashboard/route",pathname:"/api/admin/dashboard",filename:"route",bundlePath:"app/api/admin/dashboard/route"},resolvedPagePath:"C:\\xampp\\htdocs\\app_rainbowpaws\\src\\app\\api\\admin\\dashboard\\route.ts",nextConfigOutput:"standalone",userland:r}),{workAsyncStorage:p,workUnitAsyncStorage:d,serverHooks:_}=E;function T(){return(0,n.patchFetch)({workAsyncStorage:p,workUnitAsyncStorage:d})}},10846:e=>{"use strict";e.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},19771:e=>{"use strict";e.exports=require("process")},27910:e=>{"use strict";e.exports=require("stream")},28303:e=>{function t(e){var t=Error("Cannot find module '"+e+"'");throw t.code="MODULE_NOT_FOUND",t}t.keys=()=>[],t.resolve=t,t.id=28303,e.exports=t},28354:e=>{"use strict";e.exports=require("util")},29294:e=>{"use strict";e.exports=require("next/dist/server/app-render/work-async-storage.external.js")},34631:e=>{"use strict";e.exports=require("tls")},41204:e=>{"use strict";e.exports=require("string_decoder")},44870:e=>{"use strict";e.exports=require("next/dist/compiled/next-server/app-route.runtime.prod.js")},55511:e=>{"use strict";e.exports=require("crypto")},63033:e=>{"use strict";e.exports=require("next/dist/server/app-render/work-unit-async-storage.external.js")},66136:e=>{"use strict";e.exports=require("timers")},74075:e=>{"use strict";e.exports=require("zlib")},74431:(e,t,a)=>{"use strict";a.d(t,{Xc:()=>r});let r=e=>{let t=e.headers.get("cookie");if(!t)return null;let a=t.split(";").find(e=>e.trim().startsWith("auth_token="));if(!a)return null;let r=a.split("=")[1];if(!r)return null;try{let e=decodeURIComponent(r);if(!e||!e.includes("_"))return null;return e}catch(e){return null}}},78335:()=>{},79428:e=>{"use strict";e.exports=require("buffer")},79551:e=>{"use strict";e.exports=require("url")},91645:e=>{"use strict";e.exports=require("net")},94735:e=>{"use strict";e.exports=require("events")},96487:()=>{}};var t=require("../../../../webpack-runtime.js");t.C(e);var a=e=>t(t.s=e),r=t.X(0,[4447,580,6101],()=>a(8076));module.exports=r})();