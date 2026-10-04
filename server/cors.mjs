const pagesOrigin='https://mac-mac-sg.github.io';
export function publicReadCors(response,request){
 const path=new URL(request.url).pathname;
 const publicPath=['/api/data','/api/live','/api/recent-games','/api/head-to-head'].includes(path)||/^\/api\/reports\/(?:staefa|stgallen|[1-9][0-9]{0,8})$/.test(path)||/^\/api\/articles\/[a-zA-Z0-9_-]{1,80}$/.test(path);
 const protectedPath=['/api/access','/api/refresh'].includes(path);
 const pagesRequest=request.headers.get('Origin')===pagesOrigin;
 const preflight=request.method==='OPTIONS'&&pagesRequest&&protectedPath&&['GET','POST'].includes(request.headers.get('Access-Control-Request-Method'));
 const protectedRequest=pagesRequest&&protectedPath&&['GET','POST'].includes(request.method);
 if(!preflight&&!protectedRequest&&(request.method!=='GET'||!publicPath))return response;
 // CORS grants no write permission: protected routes require an owner-issued bearer grant.
 const result=new Response(response.body,response);
 result.headers.set('Access-Control-Allow-Origin',pagesOrigin);
 if(preflight){result.headers.set('Access-Control-Allow-Methods','GET, POST');result.headers.set('Access-Control-Allow-Headers','Authorization, Content-Type');result.headers.set('Access-Control-Max-Age','600')}
 return result;
}
