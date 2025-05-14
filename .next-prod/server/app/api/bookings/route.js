"use strict";(()=>{var e={};e.id=4190,e.ids=[4190],e.modules={3295:e=>{e.exports=require("next/dist/server/app-render/after-task-async-storage.external.js")},10846:e=>{e.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},19771:e=>{e.exports=require("process")},21572:e=>{e.exports=require("nodemailer")},27910:e=>{e.exports=require("stream")},28354:e=>{e.exports=require("util")},29294:e=>{e.exports=require("next/dist/server/app-render/work-async-storage.external.js")},34631:e=>{e.exports=require("tls")},41204:e=>{e.exports=require("string_decoder")},44870:e=>{e.exports=require("next/dist/compiled/next-server/app-route.runtime.prod.js")},55511:e=>{e.exports=require("crypto")},63033:e=>{e.exports=require("next/dist/server/app-render/work-unit-async-storage.external.js")},66136:e=>{e.exports=require("timers")},74075:e=>{e.exports=require("zlib")},74431:(e,r,s)=>{s.d(r,{Xc:()=>o});let o=e=>{let r=e.headers.get("cookie");if(!r)return null;let s=r.split(";").find(e=>e.trim().startsWith("auth_token="));if(!s)return null;let o=s.split("=")[1];if(!o)return null;try{let e=decodeURIComponent(o);if(!e||!e.includes("_"))return null;return e}catch(e){return null}}},79428:e=>{e.exports=require("buffer")},79551:e=>{e.exports=require("url")},91645:e=>{e.exports=require("net")},91892:(e,r,s)=>{s.r(r),s.d(r,{patchFetch:()=>k,routeModule:()=>g,serverHooks:()=>v,workAsyncStorage:()=>m,workUnitAsyncStorage:()=>b});var o={};s.r(o),s.d(o,{GET:()=>u,POST:()=>_});var t=s(96559),i=s(48088),n=s(37719),a=s(32190),c=s(74431),d=s(5069);let{sendBookingConfirmationEmail:p}=s(20048),l={1:{name:"Basic Cremation",description:"Simple cremation service with standard urn",price:3500},2:{name:"Premium Cremation",description:"Private cremation with premium urn and memorial certificate",price:5500},3:{name:"Deluxe Package",description:"Private cremation with wooden urn and memorial service",price:6e3}};async function u(e){try{let r=(0,c.Xc)(e);if(!r)return a.NextResponse.json({error:"Unauthorized"},{status:401});let[s,o]=r.split("_");if(!s||"user"!==o)return a.NextResponse.json({error:"Unauthorized"},{status:401});let t=e.nextUrl.searchParams.get("status");console.log("Fetching bookings for user:",s);let i="",n=[];try{console.log("Checking if bookings table exists...");let e=await (0,d.query)("SELECT COUNT(*) as count FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'bookings'");if(e&&0!==e[0].count){console.log("Bookings table exists, checking structure...");let e=await (0,d.query)("SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'bookings' AND COLUMN_NAME = 'service_provider_id'");if(e&&e.length>0)console.log("Using bookings_tables.sql structure"),i=`
            SELECT b.*,
                   sp.name as provider_name,
                   sp.address as provider_address,
                   spkg.name as service_name,
                   spkg.description as service_description,
                   spkg.price as service_price
            FROM bookings b
            LEFT JOIN service_providers sp ON b.service_provider_id = sp.id
            LEFT JOIN service_packages spkg ON b.service_package_id = spkg.id
            WHERE b.user_id = ?
          `,n=[s],t&&(i+=" AND b.status = ?",n.push(t));else{let e=await (0,d.query)("SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'bookings' AND COLUMN_NAME = 'business_service_id'");e&&e.length>0?(console.log("Using schema.sql structure"),i=`
              SELECT b.*,
                     p.name as pet_name,
                     p.species as pet_type,
                     bs.price as service_price,
                     bp.business_name as provider_name,
                     bp.business_address as provider_address,
                     st.name as service_name,
                     st.description as service_description
              FROM bookings b
              LEFT JOIN pets p ON b.pet_id = p.id
              LEFT JOIN business_services bs ON b.business_service_id = bs.id
              LEFT JOIN business_profiles bp ON bs.business_id = bp.id
              LEFT JOIN service_types st ON bs.service_type_id = st.id
              WHERE b.user_id = ?
            `):(console.log("Using simple bookings query without joins"),i=`
              SELECT b.*,
                     'Service Provider' as provider_name,
                     'Service Address' as provider_address,
                     'Service' as service_name,
                     'Service Description' as service_description,
                     b.total_amount as service_price,
                     'Pet' as pet_name,
                     'Unknown' as pet_type
              FROM bookings b
              WHERE b.user_id = ?
            `),n=[s],t&&(i+=" AND b.status = ?",n.push(t))}}else{console.log("Bookings table does not exist, checking for service_bookings table...");let e=await (0,d.query)("SELECT COUNT(*) as count FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'service_bookings'");if(e&&e[0].count>0)console.log("Using service_bookings table"),i=`
            SELECT sb.*,
                   st.name as service_name,
                   st.description as service_description,
                   sb.price as service_price,
                   p.name as pet_name,
                   p.species as pet_type,
                   CONCAT('Service Provider #', sb.provider_id) as provider_name,
                   sb.location_address as provider_address
            FROM service_bookings sb
            LEFT JOIN service_types st ON sb.service_type_id = st.id
            LEFT JOIN pets p ON sb.pet_id = p.id
            WHERE sb.user_id = ?
          `,n=[s],t&&(i+=" AND sb.status = ?",n.push(t));else throw Error("No bookings table found in the database")}console.log("Executing query:",i),console.log("With params:",n);let r=await (0,d.query)(i,n);if(console.log("Bookings found:",r?r.length:0),!r||0===r.length)return console.log("No bookings found for user:",s),a.NextResponse.json({bookings:[]});let o=r.map(e=>{let r=e.booking_date?new Date(e.booking_date):null,s=r?r.toISOString().split("T")[0]:null;return{...e,booking_date:s,provider_name:e.provider_name||"Unknown Provider",provider_address:e.provider_address||"No address available",service_name:e.service_name||"Unknown Service",service_description:e.service_description||"No description available",pet_name:e.pet_name||"Unknown Pet",pet_type:e.pet_type||"Unknown Type"}});return a.NextResponse.json({bookings:o})}catch(e){console.error("Database error:",e);try{console.log("Testing database connection...");let e=await (0,d.query)("SELECT 1 as test");if(console.log("Database connection test result:",e),!e||!Array.isArray(e)||0===e.length)return console.error("Database connection test failed"),a.NextResponse.json({error:"Database connection error",details:"Could not connect to the database"},{status:500});console.log("Database connection is working, but query failed"),console.log("Trying simple query...");let r=`
          SELECT b.*,
                 'Service Provider' as provider_name,
                 'Service Address' as provider_address,
                 'Service' as service_name,
                 'Service Description' as service_description,
                 b.total_amount as service_price,
                 'Pet' as pet_name,
                 'Unknown' as pet_type
          FROM bookings b
          WHERE b.user_id = ?
        `,o=[s];try{let e=await (0,d.query)(r,o);if(console.log("Simple query result:",e),e&&Array.isArray(e)){console.log("Simple query succeeded, returning booking data");let r=e.map(e=>{let r=e.booking_date?new Date(e.booking_date):null,s=r?r.toISOString().split("T")[0]:null;return{...e,booking_date:s}});return a.NextResponse.json({bookings:r})}}catch(e){console.error("Simple query failed:",e)}console.log("Falling back to mock data");let i=[{id:1,user_id:parseInt(s),pet_id:1,business_service_id:1,booking_date:"2023-11-15",booking_time:"10:00:00",status:"confirmed",total_amount:3500,special_requests:"Please handle with extra care",created_at:"2023-11-01T10:00:00",updated_at:"2023-11-01T10:00:00",provider_name:"Rainbow Bridge Pet Cremation",provider_address:"Capitol Drive, Balanga City, Bataan, Philippines",service_name:l[1].name,service_description:l[1].description,service_price:l[1].price,pet_name:"Max",pet_type:"Dog"},{id:2,user_id:parseInt(s),pet_id:2,business_service_id:3,booking_date:"2023-11-20",booking_time:"14:30:00",status:"pending",total_amount:6e3,special_requests:"Would like to be present during the service",created_at:"2023-11-05T14:30:00",updated_at:"2023-11-05T14:30:00",provider_name:"Peaceful Paws Memorial",provider_address:"Tuyo, Balanga City, Bataan, Philippines",service_name:l[3].name,service_description:l[3].description,service_price:l[3].price,pet_name:"Luna",pet_type:"Cat"}],n=i;return t&&(n=i.filter(e=>e.status===t.toLowerCase())),a.NextResponse.json({bookings:n,warning:"Using mock data due to database query issues"})}catch(e){return console.error("Database connection test error:",e),a.NextResponse.json({error:"Database connection error",details:"Could not connect to the database"},{status:500})}}}catch(e){return console.error("Error fetching bookings:",e),a.NextResponse.json({error:"Internal Server Error"},{status:500})}}async function _(e){try{let r,s;console.log("Creating new booking...");let o=(0,c.Xc)(e);if(o){if([r,s]=o.split("_"),console.log(`User authenticated with token: ID ${r}, type ${s}`),!r||"user"!==s)return a.NextResponse.json({error:"Unauthorized: Invalid user type"},{status:401})}else{let s=await e.json();if(!s.userId)return console.error("No authentication token or userId provided"),a.NextResponse.json({error:"Unauthorized: No authentication"},{status:401});r=s.userId,console.log(`Using userId from request body: ${r}`)}let t=await e.json();console.log("Received booking data:",t);let i=["providerId","date","time"].filter(e=>!t[e]);if(i.length>0)return console.error(`Missing required fields: ${i.join(", ")}`),a.NextResponse.json({error:`Missing required fields: ${i.join(", ")}`},{status:400});if(!t.petId&&(!t.petName||!t.petType))return console.error("Missing pet information"),a.NextResponse.json({error:"Either an existing pet ID or new pet details (name and type) must be provided"},{status:400});let n={name:t.packageName||"Unknown Service",description:"Service package",price:t.price||0};if(t.packageId)try{console.log(`Fetching package details for ID: ${t.packageId}`);let e=await (0,d.query)(`
          SELECT name, description, price 
          FROM service_packages 
          WHERE id = ? 
          LIMIT 1
        `,[t.packageId]);e&&e.length>0&&(n={name:e[0].name,description:e[0].description,price:e[0].price},console.log("Found package details:",n))}catch(e){console.error("Error fetching package details:",e)}let l={id:null,user_id:parseInt(r),pet_id:t.petId?parseInt(t.petId):null,package_id:t.packageId?parseInt(t.packageId):null,provider_id:t.providerId?parseInt(t.providerId):null,booking_date:t.date,booking_time:t.time,status:"pending",total_amount:n.price,special_requests:t.specialRequests||"",payment_method:t.paymentMethod||"cash",created_at:new Date().toISOString(),updated_at:new Date().toISOString(),provider_name:t.providerName||"Service Provider",provider_address:t.providerAddress||"Provider Address",service_name:n.name,service_description:n.description,service_price:n.price,pet_name:t.petName||"Pet",pet_type:t.petType||"Unknown"};console.log("Prepared booking object:",l);try{let e;console.log("Attempting to save booking to database...");let r=await (0,d.query)("SELECT COUNT(*) as count FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'bookings'");if(r&&r[0].count>0){let r=(await (0,d.query)(`
          SELECT COLUMN_NAME 
          FROM INFORMATION_SCHEMA.COLUMNS 
          WHERE TABLE_SCHEMA = DATABASE() 
          AND TABLE_NAME = 'bookings'
        `)).map(e=>e.COLUMN_NAME.toLowerCase()),s=r.includes("package_id"),o=r.includes("provider_id");if(console.log(`Bookings table columns - package_id: ${s}, provider_id: ${o}`),s&&o)e=(await (0,d.query)(`
            INSERT INTO bookings (
              user_id, pet_id, package_id, provider_id, booking_date, booking_time,
              status, total_amount, special_requests, payment_method, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
          `,[l.user_id,l.pet_id,l.package_id,l.provider_id,l.booking_date,l.booking_time,l.status,l.total_amount,l.special_requests,l.payment_method])).insertId,console.log(`Booking saved with ID: ${e} using new schema`);else{let s=null,o=null;if(r.includes("service_provider_id")&&(s="service_provider_id"),r.includes("business_id")&&(s="business_id"),r.includes("service_package_id")&&(o="service_package_id"),r.includes("business_service_id")&&(o="business_service_id"),s&&o)e=(await (0,d.query)(`
              INSERT INTO bookings (
                user_id, pet_id, ${o}, ${s}, booking_date, booking_time,
                status, total_amount, special_requests, created_at, updated_at
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
            `,[l.user_id,l.pet_id,l.package_id,l.provider_id,l.booking_date,l.booking_time,l.status,l.total_amount,l.special_requests])).insertId,console.log(`Booking saved with ID: ${e} using adapted schema`);else throw console.error("Could not determine appropriate booking schema"),Error("Unsupported booking table schema")}}else throw console.error("No bookings table found in database"),Error("Bookings table does not exist");l.id=e}catch(e){console.error("Error saving booking to database:",e),l.id=null,l._error="Failed to save to database, but continuing with email notification"}try{console.log("Preparing to send booking confirmation email...");let e="";try{let s=await (0,d.query)("SELECT email FROM users WHERE id = ?",[r]);s&&s.length>0&&(e=s[0].email)}catch(r){console.error("Error fetching user email:",r),e=t.email||"user@example.com"}e||(console.warn("Could not find user email for booking confirmation. Using fallback."),e=t.email||"user@example.com");let s=new Date(t.date).toLocaleDateString("en-US",{weekday:"long",year:"numeric",month:"long",day:"numeric"}),o="";try{let e=await (0,d.query)("SELECT first_name, last_name FROM users WHERE id = ?",[r]);e&&e.length>0&&(o=`${e[0].first_name} ${e[0].last_name}`)}catch(e){console.error("Error fetching user name:",e),o="Valued Customer"}o||(o="Valued Customer");let i={customerName:o,serviceName:l.service_name,providerName:l.provider_name,bookingDate:s,bookingTime:t.time,petName:l.pet_name,bookingId:l.id},n=await p(e,i);n.success?console.log(`Booking confirmation email sent successfully to ${e}. Message ID: ${n.messageId}`):console.error("Failed to send booking confirmation email:",n.error)}catch(e){console.error("Error sending booking confirmation email:",e)}let u={success:!0,message:"Booking created successfully",booking:{id:l.id,date:l.booking_date,time:l.booking_time,provider:l.provider_name,service:l.service_name,price:l.total_amount,status:l.status,pet:l.pet_name}};return l._error&&(u.warning=l._error),console.log("Booking process completed successfully"),a.NextResponse.json(u)}catch(e){return console.error("Error creating booking:",e),a.NextResponse.json({error:"Internal Server Error",message:e instanceof Error?e.message:"Unknown error occurred"},{status:500})}}let g=new t.AppRouteRouteModule({definition:{kind:i.RouteKind.APP_ROUTE,page:"/api/bookings/route",pathname:"/api/bookings",filename:"route",bundlePath:"app/api/bookings/route"},resolvedPagePath:"C:\\xampp\\htdocs\\app_rainbowpaws\\src\\app\\api\\bookings\\route.ts",nextConfigOutput:"standalone",userland:o}),{workAsyncStorage:m,workUnitAsyncStorage:b,serverHooks:v}=g;function k(){return(0,n.patchFetch)({workAsyncStorage:m,workUnitAsyncStorage:b})}},94735:e=>{e.exports=require("events")}};var r=require("../../../webpack-runtime.js");r.C(e);var s=e=>r(r.s=e),o=r.X(0,[4447,580,6101,9570],()=>s(91892));module.exports=o})();