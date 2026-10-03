const pagesOrigin='https://mac-mac-sg.github.io';
export function publicReadCors(response,request){
 const path=new URL(request.url).pathname;
 const publicPath=['/api/data','/api/live','/api/recent-games','/api/head-to-head'].includes(path)||/^\/api\/articles\/[a-zA-Z0-9_-]{1,80}$/.test(path);
 if(request.method!=='GET'||!publicPath)return response;
 // Constant allowlist, no credentials and no CORS on access/refresh/admin routes.
 const result=new Response(response.body,response);
 result.headers.set('Access-Control-Allow-Origin',pagesOrigin);
 return result;
}
