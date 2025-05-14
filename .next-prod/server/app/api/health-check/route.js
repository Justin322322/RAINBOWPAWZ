(()=>{var e={};e.id=1143,e.ids=[1143],e.modules={3295:e=>{"use strict";e.exports=require("next/dist/server/app-render/after-task-async-storage.external.js")},5069:(e,t,s)=>{"use strict";let r;s.r(t),s.d(t,{default:()=>l,query:()=>c,testConnection:()=>u});var o=s(46101);let a=(e,t)=>{},n={host:"localhost",user:"root",database:"rainbow_paws",port:3306};a("Database configuration in db.ts:",{host:n.host,user:n.user,port:n.port,database:n.database});let i={host:"localhost",user:"root",password:"",database:"rainbow_paws",port:3306,waitForConnections:!0,connectionLimit:10,queueLimit:0,socketPath:void 0,insecureAuth:!0};a("Final database configuration:",{host:i.host,user:i.user,port:i.port,database:i.database,environment:"production"});try{a("Attempting to create MySQL connection pool with config:",{host:i.host,user:i.user,database:i.database,port:i.port}),r=o.createPool(i),a("MySQL connection pool created successfully"),(async()=>{try{let e=await r.getConnection();a("Successfully got a test connection from the pool"),e.release(),a("Test connection released back to pool")}catch(e){console.error("Failed to get a test connection from the pool:",e)}})()}catch(e){console.error("Error creating MySQL connection pool:",e),console.error("Error details:",e.message),"ECONNREFUSED"===e.code?console.error("Connection refused. Make sure MySQL is running on port 3306."):"ER_ACCESS_DENIED_ERROR"===e.code?console.error("Access denied. Check your MySQL username and password."):"ER_BAD_DB_ERROR"===e.code&&console.error("Database does not exist. Make sure the database name is correct."),a("Creating fallback MySQL connection pool with default values");try{r=o.createPool(i),a("Fallback pool created successfully")}catch(e){console.error("Failed to create fallback pool:",e),r=o.createPool({host:"localhost",user:"root",password:"",database:"rainbow_paws",port:3306})}}async function c(e,t=[]){try{let s=await r.getConnection();a("Got connection from pool");try{let[r]=await s.query(e,t);return r}finally{s.release(),a("Connection released back to pool")}}catch(s){if(console.error("Database query error:",s),console.error("Failed query:",e),console.error("Query parameters:",t),"ECONNREFUSED"===s.code)console.error("Database connection refused. Make sure MySQL is running and accessible."),console.error("Current connection settings:",{host:n.host,port:n.port,user:n.user,database:n.database});else if("ER_ACCESS_DENIED_ERROR"===s.code)console.error("Access denied. Check your username and password.");else if("ER_BAD_DB_ERROR"===s.code)console.error("Database does not exist. Make sure the database name is correct.");else if("PROTOCOL_CONNECTION_LOST"===s.code){console.error("Database connection was closed. Trying to reconnect...");try{r=o.createPool(i),console.log("Reconnected to MySQL successfully")}catch(e){console.error("Failed to reconnect to MySQL:",e)}}throw s}}async function u(){try{a("Testing database connection..."),await c("SELECT 1 as test"),a("Database connection test successful");try{a("Checking users table...");let e=await c("SELECT COUNT(*) as count FROM users");a(`Users table has ${e[0].count} records`)}catch(e){console.error("Error checking users table:",e.message)}return!0}catch(e){console.error("Database connection test failed:",e);try{a("Trying direct connection without pool...");let e=await o.createConnection({host:i.host,user:i.user,password:i.password,port:3306,database:i.database});return a("Direct connection successful"),await e.end(),a("Direct connection closed"),r=o.createPool(i),a("Connection pool recreated"),!0}catch(e){return console.error("Direct connection failed:",e),!1}}}let l=r},10846:e=>{"use strict";e.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},19771:e=>{"use strict";e.exports=require("process")},27910:e=>{"use strict";e.exports=require("stream")},28303:e=>{function t(e){var t=Error("Cannot find module '"+e+"'");throw t.code="MODULE_NOT_FOUND",t}t.keys=()=>[],t.resolve=t,t.id=28303,e.exports=t},28354:e=>{"use strict";e.exports=require("util")},29294:e=>{"use strict";e.exports=require("next/dist/server/app-render/work-async-storage.external.js")},34631:e=>{"use strict";e.exports=require("tls")},41204:e=>{"use strict";e.exports=require("string_decoder")},44870:e=>{"use strict";e.exports=require("next/dist/compiled/next-server/app-route.runtime.prod.js")},55511:e=>{"use strict";e.exports=require("crypto")},63033:e=>{"use strict";e.exports=require("next/dist/server/app-render/work-unit-async-storage.external.js")},66136:e=>{"use strict";e.exports=require("timers")},74075:e=>{"use strict";e.exports=require("zlib")},78335:()=>{},79428:e=>{"use strict";e.exports=require("buffer")},79551:e=>{"use strict";e.exports=require("url")},91645:e=>{"use strict";e.exports=require("net")},94735:e=>{"use strict";e.exports=require("events")},96487:()=>{},99206:(e,t,s)=>{"use strict";s.r(t),s.d(t,{patchFetch:()=>R,routeModule:()=>d,serverHooks:()=>A,workAsyncStorage:()=>T,workUnitAsyncStorage:()=>p});var r={};s.r(r),s.d(r,{GET:()=>E});var o=s(96559),a=s(48088),n=s(37719),i=s(32190),c=s(5069);let u=!1;async function l(){if(u)return!0;try{if(console.log("Verifying database structures..."),!await (0,c.query)("SELECT 1 as test"))return console.error("Failed to connect to database"),!1;let e=!0,t=(await (0,c.query)(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = DATABASE()
    `)).map(e=>e.table_name||e.TABLE_NAME);console.log("Existing tables:",t);let s=["users","business_profiles","pets","password_reset_tokens"].filter(e=>!t.includes(e));if(s.length>0&&(console.log("Missing tables:",s),e=!1),e)return u=!0,!0;return console.log("Running database initialization..."),s.includes("users")&&(await (0,c.query)(`
        CREATE TABLE IF NOT EXISTS users (
          id INT AUTO_INCREMENT PRIMARY KEY,
          first_name VARCHAR(50) NOT NULL,
          last_name VARCHAR(50) NOT NULL,
          email VARCHAR(100) NOT NULL UNIQUE,
          password VARCHAR(255) NOT NULL,
          phone_number VARCHAR(20),
          address TEXT,
          sex VARCHAR(20),
          user_type VARCHAR(20) NOT NULL DEFAULT 'fur_parent',
          is_verified BOOLEAN DEFAULT 0,
          is_otp_verified BOOLEAN DEFAULT 0,
          status VARCHAR(20) DEFAULT 'active',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
      `),console.log("Users table created")),s.includes("business_profiles")&&(await (0,c.query)(`
        CREATE TABLE IF NOT EXISTS business_profiles (
          id INT AUTO_INCREMENT PRIMARY KEY,
          user_id INT NOT NULL,
          business_name VARCHAR(100) NOT NULL,
          business_type VARCHAR(50) NOT NULL,
          contact_first_name VARCHAR(50) NOT NULL,
          contact_last_name VARCHAR(50) NOT NULL,
          business_phone VARCHAR(20) NOT NULL,
          business_address TEXT NOT NULL,
          province VARCHAR(50),
          city VARCHAR(50),
          zip VARCHAR(20),
          business_hours TEXT,
          service_description TEXT,
          verification_status VARCHAR(20) DEFAULT 'pending',
          verification_date TIMESTAMP NULL,
          verification_notes TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
      `),console.log("Business profiles table created")),s.includes("pets")&&(await (0,c.query)(`
        CREATE TABLE IF NOT EXISTS pets (
          id INT AUTO_INCREMENT PRIMARY KEY,
          user_id INT NOT NULL,
          name VARCHAR(50) NOT NULL,
          species VARCHAR(50) NOT NULL,
          breed VARCHAR(50),
          age INT,
          gender VARCHAR(20),
          weight DECIMAL(5,2),
          photo_path VARCHAR(255),
          special_notes TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
      `),console.log("Pets table created")),s.includes("password_reset_tokens")&&(await (0,c.query)(`
        CREATE TABLE IF NOT EXISTS password_reset_tokens (
          id INT AUTO_INCREMENT PRIMARY KEY,
          user_id INT NOT NULL,
          token VARCHAR(100) NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          expires_at DATETIME NOT NULL,
          is_used TINYINT(1) DEFAULT 0,
          UNIQUE KEY unique_token (token),
          INDEX idx_user_id (user_id),
          INDEX idx_token (token),
          INDEX idx_expires_at (expires_at),
          INDEX idx_is_used (is_used),
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      `),console.log("Password reset tokens table created")),u=!0,!0}catch(e){return console.error("Error initializing database:",e),!1}}async function E(){console.log("Health check API called");let e={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Methods":"GET, OPTIONS","Access-Control-Allow-Headers":"Content-Type"};if("OPTIONS"===Request.prototype.method)return new i.NextResponse(null,{status:204,headers:e});try{let t=await (0,c.testConnection)(),s=!1;return t&&(s=await l()),i.NextResponse.json({status:"ok",timestamp:new Date().toISOString(),database:{connected:t,initialized:s}},{status:200,headers:e})}catch(t){return console.error("Health check error:",t),i.NextResponse.json({status:"error",timestamp:new Date().toISOString(),message:t instanceof Error?t.message:"Unknown error"},{status:500,headers:e})}}let d=new o.AppRouteRouteModule({definition:{kind:a.RouteKind.APP_ROUTE,page:"/api/health-check/route",pathname:"/api/health-check",filename:"route",bundlePath:"app/api/health-check/route"},resolvedPagePath:"C:\\xampp\\htdocs\\app_rainbowpaws\\src\\app\\api\\health-check\\route.ts",nextConfigOutput:"standalone",userland:r}),{workAsyncStorage:T,workUnitAsyncStorage:p,serverHooks:A}=d;function R(){return(0,n.patchFetch)({workAsyncStorage:T,workUnitAsyncStorage:p})}}};var t=require("../../../webpack-runtime.js");t.C(e);var s=e=>t(t.s=e),r=t.X(0,[4447,580,6101],()=>s(99206));module.exports=r})();