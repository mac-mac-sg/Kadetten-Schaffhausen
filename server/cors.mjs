const pagesOrigin='https://mac-mac-sg.github.io';
export function publicReadCors(response,request){
 const path=new URL(request.url).pathname;
 const publicPath=/^\/api\/programmes\/[a-zA-Z0-9_-]{1,80}(\/pdf)?$/.test(path)||/^\/api\/previews\/(kadetten|fcsg)\/[a-zA-Z0-9_-]{1,80}$/.test(path)||/^\/api\/fcsg\/matches\/[1-9][0-9]{0,8}$/.test(path)||path==='/api/fcsg/live'||/^\/api\/fcsg\/articles\/[0-9]+$/.test(path)||['/api/fcsg/data','/api/fcsg/players','/api/data','/api/live','/api/recent-games','/api/head-to-head'].includes(path)||/^\/api\/reports\/(?:staefa|stgallen|[1-9][0-9]{0,8})$/.test(path)||/^\/api\/(?:ehf-reports|match-reports)\/[a-zA-Z0-9_-]{1,80}$/.test(path)||/^\/api\/articles\/[a-zA-Z0-9_-]{1,80}$/.test(path);
 if(request.method!=='GET'||!publicPath)return response;
 // Constant allowlist, no credentials and no CORS on access/refresh/admin routes.
 const result=new Response(response.body,response);
 result.headers.set('Access-Control-Allow-Origin',pagesOrigin);
 return result;
}
