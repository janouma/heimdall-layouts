import{SvelteElement,append,attr,attribute_to_object,binding_callbacks,destroy_each,detach,element,empty,flush,init,insert,is_function,listen,noop,not_equal,run_all,set_custom_element_data,space,subscribe}from"/heimdall-layouts/layouts/dashboard/../../packages/svelte/internal/index.mjs";import"/heimdall-layouts/layouts/dashboard/../../packages/joi-browser.min.js";import{onMount,onDestroy,tick}from"/heimdall-layouts/layouts/dashboard/../../packages/svelte/internal/index.mjs";import{createValidator}from"/heimdall-layouts/layouts/dashboard/../../lib/validation.js";import loglevelPlaceholder from"/heimdall-layouts/layouts/dashboard/../../lib/loglevel_placeholder.js";import"/heimdall-layouts/layouts/dashboard/widget/index.js";import"/heimdall-layouts/layouts/dashboard/add_widget/index.js";import"/heimdall-layouts/layouts/dashboard/workspace_finder/index.js";function get_each_context(t,e,o){const n=t.slice();return n[30]=e[o].title,n}function create_if_block_1(t){let e,o=t[2],n=[];for(let e=0;e<o.length;e+=1)n[e]=create_each_block(get_each_context(t,o,e));return{c(){for(let t=0;t<n.length;t+=1)n[t].c();e=empty()},m(t,o){for(let e=0;e<n.length;e+=1)n[e].m(t,o);insert(t,e,o)},p(t,a){if(324&a[0]){let i;for(o=t[2],i=0;i<o.length;i+=1){const s=get_each_context(t,o,i);n[i]?n[i].p(s,a):(n[i]=create_each_block(s),n[i].c(),n[i].m(e.parentNode,e))}for(;i<n.length;i+=1)n[i].d(1);n.length=o.length}},d(t){destroy_each(n,t),t&&detach(e)}}}function create_each_block(t){let e,o,n,a;return{c(){e=element("hdl-dashboard-widget"),set_custom_element_data(e,"class","pined"),set_custom_element_data(e,"title",o=t[30])},m(o,i){insert(o,e,i),n||(a=[listen(e,"show-item-content",t[6]),listen(e,"remove",(function(){is_function(t[8](t[30]))&&t[8](t[30]).apply(this,arguments)}))],n=!0)},p(n,a){t=n,4&a[0]&&o!==(o=t[30])&&set_custom_element_data(e,"title",o)},d(t){t&&detach(e),n=!1,run_all(a)}}}function create_if_block(t){let e,o,n,a;return{c(){e=element("hdl-dashboard-add-widget"),set_custom_element_data(e,"title",o=t[1]?.body.addWidget)},m(o,i){insert(o,e,i),n||(a=listen(e,"click",t[7]),n=!0)},p(t,n){2&n[0]&&o!==(o=t[1]?.body.addWidget)&&set_custom_element_data(e,"title",o)},d(t){t&&detach(e),n=!1,a()}}}function create_fragment(t){let e,o,n,a,i,s,l,r=t[2]?.length>0&&create_if_block_1(t),d=!t[3]&&create_if_block(t);return{c(){e=element("div"),o=element("hdl-dashboard-widget"),a=space(),r&&r.c(),i=space(),d&&d.c(),this.c=noop,set_custom_element_data(o,"title",n=t[1]?.body.recentlyAdded??getTitlePlaceholder(35)),set_custom_element_data(o,"readonly",""),attr(e,"class","viewport")},m(n,c){insert(n,e,c),append(e,o),t[16](o),append(e,a),r&&r.m(e,null),append(e,i),d&&d.m(e,null),s||(l=listen(o,"show-item-content",t[6]),s=!0)},p(t,a){2&a[0]&&n!==(n=t[1]?.body.recentlyAdded??getTitlePlaceholder(35))&&set_custom_element_data(o,"title",n),t[2]?.length>0?r?r.p(t,a):(r=create_if_block_1(t),r.c(),r.m(e,i)):r&&(r.d(1),r=null),t[3]?d&&(d.d(1),d=null):d?d.p(t,a):(d=create_if_block(t),d.c(),d.m(e,null))},i:noop,o:noop,d(o){o&&detach(e),t[16](null),r&&r.d(),d&&d.d(),s=!1,l()}}}const MAX_PINED=4,componentDisplayName="dashboard/body";function getItemsPlaceholders(){return Array.from({length:10},((t,e)=>({$id:String(e),title:getTitlePlaceholder(50),url:"javascript:void(0)"})))}function getTitlePlaceholder(t){const e=Math.round(Math.random()*t)+15;return" ".repeat(e)}async function getMessages(){const{origin:t}=new URL(import.meta.url);return(await fetch(t+"/heimdall-layouts/layouts/dashboard/assets/messages.json")).json()}async function getLastItems(){const t=await fetch("/api/find-items",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({offset:0,max:10,includeDraft:!0})});if(t.ok)return t.json();throw new Error("could not load last items")}async function getPined(){const t=await fetch("/api/get-config/dashboard");return(await t.json())?.pined}function groupBy(t,e){return e.reduce(((e,o)=>Object.assign(e,{[o[t]]:o})),{})}function instance(t,e,o){let n,a,i,s,l,r,d,c=noop,u=noop;t.$$.on_destroy.push((()=>c())),t.$$.on_destroy.push((()=>u()));const m={log:loglevelPlaceholder.getLogger()},{joi:h}=window,p=createValidator("dashboard/body");let g,f,y,b,{layoutContext:_}=e,w=getItemsPlaceholders();function $(t){t&&m.log.error(t.toString())}function x({type:t}){if("itemsUpdate"===t)return Promise.all([k(),P()])}async function k(){o(10,w=await getLastItems())}async function j(){o(11,f=await getPined())}async function C(){const t=f.length-v().length;if(Math.abs(t)>0){o(2,b??=[]);const t=groupBy("title",b);o(2,b=f.map(((e,o)=>({title:e,items:t[e]?.items??getItemsPlaceholders()})))),await tick(),v().forEach(((t,e)=>Object.assign(t,{maxVisible:10,items:b[e].items,messages:y?.widget})))}return P()}function v(){return Array.from(g?.parentNode.querySelectorAll(".pined"))}async function P(){const t=groupBy("title",v());for await(const e of f.map(S))if(e){const{title:n,items:a}=e;o(2,b=b.map((t=>n!==t.title?t:e))),t[n].items=a}}async function S(t){try{const e=await fetch("/api/find-items",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({workspace:t,offset:0,max:300,includeDraft:!0})});if(e.ok)return{title:t,items:await e.json()};m.log.error(`could not load items of "${t}"`)}catch(e){m.log.error(`could not load items of "${t}":\n`,e)}}async function M({detail:t}){m.log.debug("pining workspace",t),await fetch("/api/set-config/dashboard",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({pined:f?.length>0?Array.from(new Set([...f,t])):[t]})}),_.mutations.setModal()}return onMount((async()=>{o(1,y=await getMessages());try{await Promise.all([k(),j()])}catch(t){m.log.error(t.toString())}})),onDestroy((()=>{_&&(_.sseClient.unsubscribe(`/api/${i}/notification`,x),_.sseClient.unsubscribe(`/api/${i}/dashboard/notification`,j),_.sseClient.offConnect(k),_.sseClient.offConnect(j))})),t.$$set=t=>{"layoutContext"in t&&o(9,_=t.layoutContext)},t.$$.update=()=>{512&t.$$.dirty[0]&&(o(5,n=_?.state.session),u(),u=subscribe(n,(t=>o(15,d=t)))),512&t.$$.dirty[0]&&(o(4,a=_?.state.workspaces),c(),c=subscribe(a,(t=>o(14,r=t)))),32768&t.$$.dirty[0]&&o(13,i=encodeURIComponent(d?.user.$id)),18432&t.$$.dirty[0]&&o(12,s=r?.filter((({name:t})=>!f?.includes(t))).map((({name:t})=>t))),6144&t.$$.dirty[0]&&o(3,l=f?.length>=4||0===s?.length),512&t.$$.dirty[0]&&p(_,"layoutContext",h.object().unknown()),1027&t.$$.dirty[0]&&g&&Object.assign(g,{items:w,messages:y?.widget}),512&t.$$.dirty[0]&&(m.log=_?.log.getLogger("layout/dashboard/body")),8704&t.$$.dirty[0]&&_&&(_.sseClient.subscribe(`/api/${i}/notification`,x,$),_.sseClient.subscribe(`/api/${i}/notification/dashboard`,j,$),_.sseClient.onConnect(k),_.sseClient.onConnect(j)),2048&t.$$.dirty[0]&&f&&C()},[g,y,b,l,a,n,function({detail:t}){m.log.debug("showing item",t),_?.mutations.setModal({component:"content-viewer",type:"web-component",paramsHaveAccessors:!0,params:{itemid:t.$id,type:t.type,title:t.title}})},function(){m.log.debug("opening workspace finder"),_?.mutations.setModal({component:"hdl-dashboard-workspace-finder",type:"web-component",paramsHaveAccessors:!0,onMount(t){t.addEventListener("pin",M)},params:{title:y?.body.pickWorkspace,workspaces:s}})},async function(t){if(m.log.debug("unpining workspace",t),f)return fetch("/api/set-config/dashboard",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({pined:f.filter((e=>e!==t))})})},_,w,f,s,i,r,d,function(t){binding_callbacks[t?"unshift":"push"]((()=>{g=t,o(0,g)}))}]}class Body extends SvelteElement{constructor(t){super(),this.shadowRoot.innerHTML="<style>:host{--main-header-height:3.93em;--size-menu-width:0}@media(min-width: 1025px){:host{--size-menu-width:4.78em}}:host{padding:var(--main-header-height) 0 0 var(--size-menu-width);box-sizing:border-box;display:block;width:100%;height:100%;overflow:auto}.viewport{display:flex;justify-content:center;flex-wrap:wrap;box-sizing:border-box;padding:1.431em;grid-column-gap:2em;-moz-column-gap:2em;column-gap:2em;grid-row-gap:3.5em;row-gap:3.5em\n  }@media(min-width: 1025px){.viewport{justify-content:flex-start\n  }}hdl-dashboard-widget,hdl-dashboard-add-widget{width:25em}hdl-dashboard-add-widget{min-height:25.125em}</style>",init(this,{target:this.shadowRoot,props:attribute_to_object(this.attributes),customElement:!0},instance,create_fragment,not_equal,{layoutContext:9},null,[-1,-1]),t&&(t.target&&insert(t.target,this,t.anchor),t.props&&(this.$set(t.props),flush()))}static get observedAttributes(){return["layoutContext"]}get layoutContext(){return this.$$.ctx[9]}set layoutContext(t){this.$$set({layoutContext:t}),flush()}}customElements.define("hdl-dashboard",Body);export default Body;