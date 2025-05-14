(()=>{var e={};e.id=9126,e.ids=[9126],e.modules={3295:e=>{"use strict";e.exports=require("next/dist/server/app-render/after-task-async-storage.external.js")},5069:(e,t,r)=>{"use strict";let o;r.r(t),r.d(t,{default:()=>l,query:()=>c,testConnection:()=>u});var s=r(46101);let n=(e,t)=>{},a={host:"localhost",user:"root",database:"rainbow_paws",port:3306};n("Database configuration in db.ts:",{host:a.host,user:a.user,port:a.port,database:a.database});let i={host:"localhost",user:"root",password:"",database:"rainbow_paws",port:3306,waitForConnections:!0,connectionLimit:10,queueLimit:0,socketPath:void 0,insecureAuth:!0};n("Final database configuration:",{host:i.host,user:i.user,port:i.port,database:i.database,environment:"production"});try{n("Attempting to create MySQL connection pool with config:",{host:i.host,user:i.user,database:i.database,port:i.port}),o=s.createPool(i),n("MySQL connection pool created successfully"),(async()=>{try{let e=await o.getConnection();n("Successfully got a test connection from the pool"),e.release(),n("Test connection released back to pool")}catch(e){console.error("Failed to get a test connection from the pool:",e)}})()}catch(e){console.error("Error creating MySQL connection pool:",e),console.error("Error details:",e.message),"ECONNREFUSED"===e.code?console.error("Connection refused. Make sure MySQL is running on port 3306."):"ER_ACCESS_DENIED_ERROR"===e.code?console.error("Access denied. Check your MySQL username and password."):"ER_BAD_DB_ERROR"===e.code&&console.error("Database does not exist. Make sure the database name is correct."),n("Creating fallback MySQL connection pool with default values");try{o=s.createPool(i),n("Fallback pool created successfully")}catch(e){console.error("Failed to create fallback pool:",e),o=s.createPool({host:"localhost",user:"root",password:"",database:"rainbow_paws",port:3306})}}async function c(e,t=[]){try{let r=await o.getConnection();n("Got connection from pool");try{let[o]=await r.query(e,t);return o}finally{r.release(),n("Connection released back to pool")}}catch(r){if(console.error("Database query error:",r),console.error("Failed query:",e),console.error("Query parameters:",t),"ECONNREFUSED"===r.code)console.error("Database connection refused. Make sure MySQL is running and accessible."),console.error("Current connection settings:",{host:a.host,port:a.port,user:a.user,database:a.database});else if("ER_ACCESS_DENIED_ERROR"===r.code)console.error("Access denied. Check your username and password.");else if("ER_BAD_DB_ERROR"===r.code)console.error("Database does not exist. Make sure the database name is correct.");else if("PROTOCOL_CONNECTION_LOST"===r.code){console.error("Database connection was closed. Trying to reconnect...");try{o=s.createPool(i),console.log("Reconnected to MySQL successfully")}catch(e){console.error("Failed to reconnect to MySQL:",e)}}throw r}}async function u(){try{n("Testing database connection..."),await c("SELECT 1 as test"),n("Database connection test successful");try{n("Checking users table...");let e=await c("SELECT COUNT(*) as count FROM users");n(`Users table has ${e[0].count} records`)}catch(e){console.error("Error checking users table:",e.message)}return!0}catch(e){console.error("Database connection test failed:",e);try{n("Trying direct connection without pool...");let e=await s.createConnection({host:i.host,user:i.user,password:i.password,port:3306,database:i.database});return n("Direct connection successful"),await e.end(),n("Direct connection closed"),o=s.createPool(i),n("Connection pool recreated"),!0}catch(e){return console.error("Direct connection failed:",e),!1}}}let l=o},10846:e=>{"use strict";e.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},19771:e=>{"use strict";e.exports=require("process")},27910:e=>{"use strict";e.exports=require("stream")},28303:e=>{function t(e){var t=Error("Cannot find module '"+e+"'");throw t.code="MODULE_NOT_FOUND",t}t.keys=()=>[],t.resolve=t,t.id=28303,e.exports=t},28354:e=>{"use strict";e.exports=require("util")},29294:e=>{"use strict";e.exports=require("next/dist/server/app-render/work-async-storage.external.js")},34631:e=>{"use strict";e.exports=require("tls")},41204:e=>{"use strict";e.exports=require("string_decoder")},44870:e=>{"use strict";e.exports=require("next/dist/compiled/next-server/app-route.runtime.prod.js")},55511:e=>{"use strict";e.exports=require("crypto")},61295:(e,t,r)=>{"use strict";r.r(t),r.d(t,{patchFetch:()=>g,routeModule:()=>h,serverHooks:()=>y,workAsyncStorage:()=>E,workUnitAsyncStorage:()=>f});var o={};r.r(o),r.d(o,{DELETE:()=>p,GET:()=>l,PUT:()=>d});var s=r(96559),n=r(48088),a=r(37719),i=r(32190),c=r(5069),u=r(74431);async function l(e,{params:t}){try{let r=t.id,o=(0,u.Xc)(e);if(!o)return i.NextResponse.json({error:"Unauthorized"},{status:401});let[s,n]=o.split("_"),a=await (0,c.query)(`
      SELECT
        id,
        user_id,
        name,
        species,
        breed,
        gender,
        age,
        weight,
        photo_path as image_path,
        special_notes,
        created_at
      FROM pets
      WHERE id = ? AND user_id = ?
      LIMIT 1
    `,[r,s]);if(!a||0===a.length)return i.NextResponse.json({error:"Pet not found or you do not have permission to access it"},{status:404});return i.NextResponse.json({pet:a[0]})}catch(e){return console.error("Error fetching pet:",e),i.NextResponse.json({error:"Failed to fetch pet",details:e instanceof Error?e.message:"Unknown error"},{status:500})}}async function d(e,{params:t}){try{let r=t.id,o=(0,u.Xc)(e);if(!o)return i.NextResponse.json({error:"Unauthorized"},{status:401});let[s,n]=o.split("_"),a=await (0,c.query)(`
      SELECT id FROM pets
      WHERE id = ? AND user_id = ?
      LIMIT 1
    `,[r,s]);if(!a||0===a.length)return i.NextResponse.json({error:"Pet not found or you do not have permission to update it"},{status:404});let{name:l,species:d,breed:p,gender:h,age:E,weight:f,imagePath:y,specialNotes:g}=await e.json();if(!l||!d)return i.NextResponse.json({error:"Name and species are required"},{status:400});await (0,c.query)(`
      UPDATE pets
      SET
        name = ?,
        species = ?,
        breed = ?,
        gender = ?,
        age = ?,
        weight = ?,
        photo_path = ?,
        special_notes = ?
      WHERE id = ? AND user_id = ?
    `,[l,d,p||null,h||null,E||null,f||null,y||null,g||null,r,s]);let R=await (0,c.query)(`
      SELECT
        id,
        name,
        species,
        breed,
        gender,
        age,
        weight,
        photo_path as image_path,
        special_notes,
        created_at
      FROM pets
      WHERE id = ?
      LIMIT 1
    `,[r]);return i.NextResponse.json({success:!0,pet:R[0],message:"Pet updated successfully"})}catch(e){return console.error("Error updating pet:",e),i.NextResponse.json({error:"Failed to update pet",details:e instanceof Error?e.message:"Unknown error"},{status:500})}}async function p(e,{params:t}){try{let r=t.id,o=(0,u.Xc)(e);if(!o)return i.NextResponse.json({error:"Unauthorized"},{status:401});let[s,n]=o.split("_"),a=await (0,c.query)(`
      SELECT id FROM pets
      WHERE id = ? AND user_id = ?
      LIMIT 1
    `,[r,s]);if(!a||0===a.length)return i.NextResponse.json({error:"Pet not found or you do not have permission to delete it"},{status:404});return await (0,c.query)("DELETE FROM pets WHERE id = ?",[r]),i.NextResponse.json({success:!0,message:"Pet deleted successfully"})}catch(e){return console.error("Error deleting pet:",e),i.NextResponse.json({error:"Failed to delete pet",details:e instanceof Error?e.message:"Unknown error"},{status:500})}}let h=new s.AppRouteRouteModule({definition:{kind:n.RouteKind.APP_ROUTE,page:"/api/pets/[id]/route",pathname:"/api/pets/[id]",filename:"route",bundlePath:"app/api/pets/[id]/route"},resolvedPagePath:"C:\\xampp\\htdocs\\app_rainbowpaws\\src\\app\\api\\pets\\[id]\\route.ts",nextConfigOutput:"standalone",userland:o}),{workAsyncStorage:E,workUnitAsyncStorage:f,serverHooks:y}=h;function g(){return(0,a.patchFetch)({workAsyncStorage:E,workUnitAsyncStorage:f})}},63033:e=>{"use strict";e.exports=require("next/dist/server/app-render/work-unit-async-storage.external.js")},66136:e=>{"use strict";e.exports=require("timers")},74075:e=>{"use strict";e.exports=require("zlib")},74431:(e,t,r)=>{"use strict";r.d(t,{Xc:()=>o});let o=e=>{let t=e.headers.get("cookie");if(!t)return null;let r=t.split(";").find(e=>e.trim().startsWith("auth_token="));if(!r)return null;let o=r.split("=")[1];if(!o)return null;try{let e=decodeURIComponent(o);if(!e||!e.includes("_"))return null;return e}catch(e){return null}}},78335:()=>{},79428:e=>{"use strict";e.exports=require("buffer")},79551:e=>{"use strict";e.exports=require("url")},91645:e=>{"use strict";e.exports=require("net")},94735:e=>{"use strict";e.exports=require("events")},96487:()=>{}};var t=require("../../../../webpack-runtime.js");t.C(e);var r=e=>t(t.s=e),o=t.X(0,[4447,580,6101],()=>r(61295));module.exports=o})();