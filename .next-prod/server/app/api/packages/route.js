(()=>{var e={};e.id=941,e.ids=[941],e.modules={3295:e=>{"use strict";e.exports=require("next/dist/server/app-render/after-task-async-storage.external.js")},5069:(e,r,s)=>{"use strict";let a;s.r(r),s.d(r,{default:()=>d,query:()=>c,testConnection:()=>p});var i=s(46101);let t=(e,r)=>{},o={host:"localhost",user:"root",database:"rainbow_paws",port:3306};t("Database configuration in db.ts:",{host:o.host,user:o.user,port:o.port,database:o.database});let n={host:"localhost",user:"root",password:"",database:"rainbow_paws",port:3306,waitForConnections:!0,connectionLimit:10,queueLimit:0,socketPath:void 0,insecureAuth:!0};t("Final database configuration:",{host:n.host,user:n.user,port:n.port,database:n.database,environment:"production"});try{t("Attempting to create MySQL connection pool with config:",{host:n.host,user:n.user,database:n.database,port:n.port}),a=i.createPool(n),t("MySQL connection pool created successfully"),(async()=>{try{let e=await a.getConnection();t("Successfully got a test connection from the pool"),e.release(),t("Test connection released back to pool")}catch(e){console.error("Failed to get a test connection from the pool:",e)}})()}catch(e){console.error("Error creating MySQL connection pool:",e),console.error("Error details:",e.message),"ECONNREFUSED"===e.code?console.error("Connection refused. Make sure MySQL is running on port 3306."):"ER_ACCESS_DENIED_ERROR"===e.code?console.error("Access denied. Check your MySQL username and password."):"ER_BAD_DB_ERROR"===e.code&&console.error("Database does not exist. Make sure the database name is correct."),t("Creating fallback MySQL connection pool with default values");try{a=i.createPool(n),t("Fallback pool created successfully")}catch(e){console.error("Failed to create fallback pool:",e),a=i.createPool({host:"localhost",user:"root",password:"",database:"rainbow_paws",port:3306})}}async function c(e,r=[]){try{let s=await a.getConnection();t("Got connection from pool");try{let[a]=await s.query(e,r);return a}finally{s.release(),t("Connection released back to pool")}}catch(s){if(console.error("Database query error:",s),console.error("Failed query:",e),console.error("Query parameters:",r),"ECONNREFUSED"===s.code)console.error("Database connection refused. Make sure MySQL is running and accessible."),console.error("Current connection settings:",{host:o.host,port:o.port,user:o.user,database:o.database});else if("ER_ACCESS_DENIED_ERROR"===s.code)console.error("Access denied. Check your username and password.");else if("ER_BAD_DB_ERROR"===s.code)console.error("Database does not exist. Make sure the database name is correct.");else if("PROTOCOL_CONNECTION_LOST"===s.code){console.error("Database connection was closed. Trying to reconnect...");try{a=i.createPool(n),console.log("Reconnected to MySQL successfully")}catch(e){console.error("Failed to reconnect to MySQL:",e)}}throw s}}async function p(){try{t("Testing database connection..."),await c("SELECT 1 as test"),t("Database connection test successful");try{t("Checking users table...");let e=await c("SELECT COUNT(*) as count FROM users");t(`Users table has ${e[0].count} records`)}catch(e){console.error("Error checking users table:",e.message)}return!0}catch(e){console.error("Database connection test failed:",e);try{t("Trying direct connection without pool...");let e=await i.createConnection({host:n.host,user:n.user,password:n.password,port:3306,database:n.database});return t("Direct connection successful"),await e.end(),t("Direct connection closed"),a=i.createPool(n),t("Connection pool recreated"),!0}catch(e){return console.error("Direct connection failed:",e),!1}}}let d=a},9995:(e,r,s)=>{"use strict";s.r(r),s.d(r,{patchFetch:()=>k,routeModule:()=>v,serverHooks:()=>_,workAsyncStorage:()=>y,workUnitAsyncStorage:()=>h});var a={};s.r(a),s.d(a,{GET:()=>d,POST:()=>l});var i=s(96559),t=s(48088),o=s(37719),n=s(32190),c=s(5069),p=s(74431);async function d(e){try{let r=new URL(e.url),s=r.searchParams.get("providerId"),a=r.searchParams.get("packageId"),i="true"===r.searchParams.get("includeInactive");if(a)return await u(parseInt(a),i);if(s)return await m(parseInt(s),i);let t=parseInt(r.searchParams.get("page")||"1"),o=parseInt(r.searchParams.get("limit")||"10"),p=(t-1)*o,d=i?"":"WHERE sp.is_active = TRUE",l=await (0,c.query)(`
      SELECT
        sp.id,
        sp.name,
        sp.description,
        sp.category,
        sp.cremation_type as cremationType,
        sp.processing_time as processingTime,
        sp.price,
        sp.conditions,
        sp.is_active as isActive,
        svp.name as providerName,
        svp.id as providerId
      FROM service_packages sp
      JOIN service_providers svp ON sp.service_provider_id = svp.id
      ${d}
      ORDER BY sp.created_at DESC
      LIMIT ? OFFSET ?
    `,[o,p]),v=await (0,c.query)(`
      SELECT COUNT(*) as total FROM service_packages ${i?"":"WHERE is_active = TRUE"}
    `),y=v[0]?.total||0,h=await g(l);return n.NextResponse.json({packages:h,pagination:{page:t,limit:o,total:y,totalPages:Math.ceil(y/o)}})}catch(e){return console.error("Error fetching packages:",e),n.NextResponse.json({error:"Failed to fetch packages",details:e instanceof Error?e.message:"Unknown error"},{status:500})}}async function l(e){try{let r=(0,p.Xc)(e);if(!r)return n.NextResponse.json({error:"Unauthorized"},{status:401});let[s,a]=r.split("_");if("business"!==a)return n.NextResponse.json({error:"Only business accounts can create packages"},{status:403});let i=await (0,c.query)("SELECT id FROM service_providers WHERE user_id = ?",[s]);if(!i||0===i.length)return n.NextResponse.json({error:"Service provider not found"},{status:404});let t=i[0].id,{name:o,description:d,category:l,cremationType:u,processingTime:m,price:g,conditions:v,inclusions:y=[],addOns:h=[],images:_=[]}=await e.json();if(!o||!d||!g)return n.NextResponse.json({error:"Missing required fields"},{status:400});await (0,c.query)("START TRANSACTION");try{let e=(await (0,c.query)(`
        INSERT INTO service_packages (
          service_provider_id, name, description, category, cremation_type,
          processing_time, price, conditions, is_active
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, TRUE)
      `,[t,o,d,l,u,m,g,v])).insertId;if(y.length>0)for(let r of y)await (0,c.query)("INSERT INTO package_inclusions (package_id, description) VALUES (?, ?)",[e,r]);if(h.length>0)for(let r of h){let s=r,a=null,i=r.match(/\(\+₱([\d,]+)\)/);i&&(a=parseFloat(i[1].replace(/,/g,"")),s=r.replace(/\s*\(\+₱[\d,]+\)/,"").trim()),await (0,c.query)("INSERT INTO package_addons (package_id, description, price) VALUES (?, ?, ?)",[e,s,a])}if(_.length>0)for(let r=0;r<_.length;r++)await (0,c.query)("INSERT INTO package_images (package_id, image_path, display_order) VALUES (?, ?, ?)",[e,_[r],r]);return await (0,c.query)("COMMIT"),n.NextResponse.json({success:!0,packageId:e,message:"Package created successfully"})}catch(e){throw await (0,c.query)("ROLLBACK"),e}}catch(e){return console.error("Error creating package:",e),n.NextResponse.json({error:"Failed to create package",details:e instanceof Error?e.message:"Unknown error"},{status:500})}}async function u(e,r=!1){try{let s=await (0,c.query)(`
      SELECT
        sp.id,
        sp.name,
        sp.description,
        sp.category,
        sp.cremation_type as cremationType,
        sp.processing_time as processingTime,
        sp.price,
        sp.conditions,
        sp.is_active as isActive,
        svp.name as providerName,
        svp.id as providerId
      FROM service_packages sp
      JOIN service_providers svp ON sp.service_provider_id = svp.id
      WHERE sp.id = ? ${r?"":"AND sp.is_active = TRUE"}
      LIMIT 1
    `,[e]);if(!s||0===s.length)return n.NextResponse.json({error:"Package not found"},{status:404});let a=await g([s[0]]);return n.NextResponse.json({package:a[0]})}catch(r){return console.error(`Error fetching package ${e}:`,r),n.NextResponse.json({error:"Failed to fetch package",details:r instanceof Error?r.message:"Unknown error"},{status:500})}}async function m(e,r=!1){try{if(console.log(`Fetching packages for provider ID: ${e}, includeInactive: ${r}`),1001===e||1002===e||1003===e){let r={1001:[{id:10001,name:"Basic Cremation Package",description:"Simple cremation service with standard urn",category:"Communal",cremationType:"Standard",processingTime:"2-3 days",price:3500,conditions:"For pets up to 50 lbs. Additional fees may apply for larger pets.",providerName:"Rainbow Bridge Pet Cremation",providerId:1001,inclusions:["Standard clay urn","Memorial certificate","Paw print impression"],addOns:["Personalized nameplate (+₱500)","Photo frame (+₱800)"],images:[]},{id:10002,name:"Premium Cremation Package",description:"Private cremation with premium urn and memorial certificate",category:"Private",cremationType:"Premium",processingTime:"1-2 days",price:5500,conditions:"For pets up to 80 lbs. Includes home pickup within 10km radius.",providerName:"Rainbow Bridge Pet Cremation",providerId:1001,inclusions:["Premium wooden urn","Memorial certificate","Paw print keepsake","Fur clipping","Photo memorial"],addOns:["Custom engraving (+₱800)","Additional keepsake urns (+₱1,200)"],images:[]},{id:10003,name:"Deluxe Memorial Package",description:"Comprehensive memorial service with deluxe urn and keepsakes",category:"Private",cremationType:"Deluxe",processingTime:"Same day",price:8500,conditions:"Available for all pet sizes. Includes home pickup and delivery within 20km radius.",providerName:"Rainbow Bridge Pet Cremation",providerId:1001,inclusions:["Deluxe marble urn","Memorial photo book","Paw print in clay","Fur clipping in glass pendant","Memorial certificate","Flower arrangement"],addOns:["Video memorial tribute (+₱1,500)","Additional keepsake jewelry (+₱1,800)"],images:[]}],1002:[{id:10004,name:"Eco-Friendly Cremation",description:"Environmentally conscious cremation with biodegradable urn",category:"Private",cremationType:"Standard",processingTime:"2-3 days",price:4500,conditions:"For pets up to 60 lbs. Includes tree planting certificate.",providerName:"Peaceful Paws Memorial",providerId:1002,inclusions:["Biodegradable urn","Tree planting certificate","Memorial seed packet","Paw print keepsake"],addOns:["Memorial garden stone (+₱1,200)","Photo frame made from reclaimed wood (+₱900)"],images:[]},{id:10005,name:"Water Memorial Package",description:"Special water-soluble urn for water ceremonies",category:"Private",cremationType:"Premium",processingTime:"3-4 days",price:6e3,conditions:"Includes detailed instructions for water memorial ceremony.",providerName:"Peaceful Paws Memorial",providerId:1002,inclusions:["Water-soluble urn","Memorial certificate","Ceremony guide","Biodegradable flowers","Paw print keepsake"],addOns:["Professional ceremony coordination (+₱2,500)","Video recording of ceremony (+₱1,500)"],images:[]}],1003:[{id:10006,name:"Home Comfort Package",description:"Compassionate at-home collection and private cremation",category:"Private",cremationType:"Premium",processingTime:"2 days",price:5e3,conditions:"Available for all pet sizes. Includes home collection within 15km radius.",providerName:"Forever Friends Pet Services",providerId:1003,inclusions:["Home collection service","Private viewing room access","Wooden urn","Memorial certificate","Paw print keepsake"],addOns:["Clay paw impression (+₱700)","Custom photo urn (+₱1,500)"],images:[]},{id:10007,name:"Family Farewell Package",description:"Private viewing and ceremony before cremation",category:"Private",cremationType:"Deluxe",processingTime:"1-2 days",price:7500,conditions:"Viewing room available for up to 2 hours. Up to 10 family members.",providerName:"Forever Friends Pet Services",providerId:1003,inclusions:["Private viewing room","Ceremony coordination","Premium wooden urn","Memorial photo display","Paw print in clay","Memorial certificate"],addOns:["Professional photography (+₱2,000)","Catering services (+₱3,500)"],images:[]},{id:10008,name:"Rainbow Bridge Memorial",description:"Complete memorial service with custom tributes",category:"Private",cremationType:"Deluxe",processingTime:"Same day",price:9500,conditions:"Includes all services and home delivery of remains within 20km radius.",providerName:"Forever Friends Pet Services",providerId:1003,inclusions:["Custom engraved urn","Memorial video tribute","Printed memorial booklets","Paw print jewelry","Fur clipping keepsake","Memorial certificate","Flower arrangement"],addOns:["Live memorial service streaming (+₱1,800)","Custom portrait painting (+₱4,500)"],images:[]},{id:10009,name:"Basic Community Cremation",description:"Affordable communal cremation service",category:"Communal",cremationType:"Standard",processingTime:"3-4 days",price:2500,conditions:"Communal cremation with other pets. No remains returned.",providerName:"Forever Friends Pet Services",providerId:1003,inclusions:["Memorial certificate","Donation to animal shelter in pet's name"],addOns:["Memorial plaque in community garden (+₱1,200)"],images:[]}]}[e]||[];return console.log(`Returning ${r.length} test packages for provider ${e}`),n.NextResponse.json({packages:r})}let s=r?"":"AND sp.is_active = TRUE",a=(await (0,c.query)(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'service_packages'
    `)).map(e=>e.COLUMN_NAME.toLowerCase()),i=a.includes("service_provider_id"),t=a.includes("provider_id"),o=a.includes("business_id");console.log(`Package columns found - service_provider_id: ${i}, provider_id: ${t}, business_id: ${o}`);let p=[];i?(console.log(`Fetching packages with service_provider_id = ${e}`),p=await (0,c.query)(`
        SELECT
          sp.id,
          sp.name,
          sp.description,
          sp.category,
          sp.cremation_type as cremationType,
          sp.processing_time as processingTime,
          sp.price,
          sp.conditions,
          sp.is_active as isActive,
          svp.name as providerName,
          svp.id as providerId
        FROM service_packages sp
        JOIN service_providers svp ON sp.service_provider_id = svp.id
        WHERE sp.service_provider_id = ? ${s}
        ORDER BY sp.created_at DESC
      `,[e])):t?(console.log(`Fetching packages with provider_id = ${e}`),p=await (0,c.query)(`
        SELECT
          sp.id,
          sp.name,
          sp.description,
          sp.category,
          sp.cremation_type as cremationType,
          sp.processing_time as processingTime,
          sp.price,
          sp.conditions,
          sp.is_active as isActive,
          svp.name as providerName,
          svp.id as providerId
        FROM service_packages sp
        JOIN service_providers svp ON sp.provider_id = svp.id
        WHERE sp.provider_id = ? ${s}
        ORDER BY sp.created_at DESC
      `,[e])):o&&(console.log(`Fetching packages with business_id = ${e}`),p=await (0,c.query)(`
        SELECT
          sp.id,
          sp.name,
          sp.description,
          sp.category,
          sp.cremation_type as cremationType,
          sp.processing_time as processingTime,
          sp.price,
          sp.conditions,
          sp.is_active as isActive,
          bp.business_name as providerName,
          bp.id as providerId
        FROM service_packages sp
        JOIN business_profiles bp ON sp.business_id = bp.id
        WHERE sp.business_id = ? ${s}
        ORDER BY sp.created_at DESC
      `,[e])),console.log(`Found ${p.length} packages for provider ${e}`);let d=await g(p);return n.NextResponse.json({packages:d})}catch(r){return console.error(`Error fetching packages for provider ${e}:`,r),n.NextResponse.json({error:"Failed to fetch packages",details:r instanceof Error?r.message:"Unknown error"},{status:500})}}async function g(e){if(!e||0===e.length)return[];let r=e.map(e=>e.id),s=await (0,c.query)(`
    SELECT package_id, description
    FROM package_inclusions
    WHERE package_id IN (?)
  `,[r]),a=await (0,c.query)(`
    SELECT package_id, description, price
    FROM package_addons
    WHERE package_id IN (?)
  `,[r]),i=await (0,c.query)(`
    SELECT package_id, image_path
    FROM package_images
    WHERE package_id IN (?)
    ORDER BY display_order ASC
  `,[r]),t={},o={},n={};return s.forEach(e=>{t[e.package_id]||(t[e.package_id]=[]),t[e.package_id].push(e.description)}),a.forEach(e=>{o[e.package_id]||(o[e.package_id]=[]);let r=e.description;e.price&&(r+=` (+₱${e.price.toLocaleString()})`),o[e.package_id].push(r)}),i.forEach(e=>{n[e.package_id]||(n[e.package_id]=[]);let r=e.image_path;r&&!r.startsWith("blob:")?r.startsWith("/uploads/")||r.startsWith("uploads/")?n[e.package_id].push(r.startsWith("/")?r:`/${r}`):n[e.package_id].push(`/uploads/packages/${r}`):r&&r.startsWith("blob:")&&console.log(`Package ${e.package_id} has blob URL that can't be served: ${r}`)}),e.map(e=>({...e,inclusions:t[e.id]||[],addOns:o[e.id]||[],images:n[e.id]||[]}))}let v=new i.AppRouteRouteModule({definition:{kind:t.RouteKind.APP_ROUTE,page:"/api/packages/route",pathname:"/api/packages",filename:"route",bundlePath:"app/api/packages/route"},resolvedPagePath:"C:\\xampp\\htdocs\\app_rainbowpaws\\src\\app\\api\\packages\\route.ts",nextConfigOutput:"standalone",userland:a}),{workAsyncStorage:y,workUnitAsyncStorage:h,serverHooks:_}=v;function k(){return(0,o.patchFetch)({workAsyncStorage:y,workUnitAsyncStorage:h})}},10846:e=>{"use strict";e.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},19771:e=>{"use strict";e.exports=require("process")},27910:e=>{"use strict";e.exports=require("stream")},28303:e=>{function r(e){var r=Error("Cannot find module '"+e+"'");throw r.code="MODULE_NOT_FOUND",r}r.keys=()=>[],r.resolve=r,r.id=28303,e.exports=r},28354:e=>{"use strict";e.exports=require("util")},29294:e=>{"use strict";e.exports=require("next/dist/server/app-render/work-async-storage.external.js")},34631:e=>{"use strict";e.exports=require("tls")},41204:e=>{"use strict";e.exports=require("string_decoder")},44870:e=>{"use strict";e.exports=require("next/dist/compiled/next-server/app-route.runtime.prod.js")},55511:e=>{"use strict";e.exports=require("crypto")},63033:e=>{"use strict";e.exports=require("next/dist/server/app-render/work-unit-async-storage.external.js")},66136:e=>{"use strict";e.exports=require("timers")},74075:e=>{"use strict";e.exports=require("zlib")},74431:(e,r,s)=>{"use strict";s.d(r,{Xc:()=>a});let a=e=>{let r=e.headers.get("cookie");if(!r)return null;let s=r.split(";").find(e=>e.trim().startsWith("auth_token="));if(!s)return null;let a=s.split("=")[1];if(!a)return null;try{let e=decodeURIComponent(a);if(!e||!e.includes("_"))return null;return e}catch(e){return null}}},78335:()=>{},79428:e=>{"use strict";e.exports=require("buffer")},79551:e=>{"use strict";e.exports=require("url")},91645:e=>{"use strict";e.exports=require("net")},94735:e=>{"use strict";e.exports=require("events")},96487:()=>{}};var r=require("../../../webpack-runtime.js");r.C(e);var s=e=>r(r.s=e),a=r.X(0,[4447,580,6101],()=>s(9995));module.exports=a})();