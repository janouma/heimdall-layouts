import{SvelteElement,append,attr,attribute_to_object,binding_callbacks,detach,element,flush,init,insert,noop,not_equal,set_data,space,src_url_equal,text}from"/heimdall-layouts/layouts/dashboard/../../packages/svelte/internal/index.mjs";import"/heimdall-layouts/layouts/dashboard/../../packages/joi-browser.min.js";import{createValidator}from"/heimdall-layouts/layouts/dashboard/../../lib/validation.js";import{createResolver}from"/heimdall-layouts/layouts/dashboard/../../lib/path.js";function create_if_block(t){let e,s;return{c(){e=element("img"),attr(e,"alt",t[3]),src_url_equal(e.src,s=t[1])||attr(e,"src",s)},m(t,s){insert(t,e,s)},p(t,i){8&i&&attr(e,"alt",t[3]),2&i&&!src_url_equal(e.src,s=t[1])&&attr(e,"src",s)},d(t){t&&detach(e)}}}function create_fragment(t){let e,s,i,a,o=t[1]&&create_if_block(t);return{c(){e=element("div"),o&&o.c(),s=space(),i=element("span"),a=text(t[0]),this.c=noop,attr(i,"class","title"),attr(e,"class","label")},m(n,r){insert(n,e,r),o&&o.m(e,null),append(e,s),append(e,i),append(i,a),t[7](e)},p(t,[i]){t[1]?o?o.p(t,i):(o=create_if_block(t),o.c(),o.m(e,s)):o&&(o.d(1),o=null),1&i&&set_data(a,t[0])},i:noop,o:noop,d(s){s&&detach(e),o&&o.d(),t[7](null)}}}function instance(t,e,s){let i,a,{title:o}=e,{snapshot:n}=e,{icon:r}=e,{iconalt:l}=e,{type:p}=e;const{joi:c}=window,d=createResolver(import.meta.url),h=createValidator("dashboard/item");return t.$$set=t=>{"title"in t&&s(0,o=t.title),"snapshot"in t&&s(4,n=t.snapshot),"icon"in t&&s(1,r=t.icon),"iconalt"in t&&s(5,l=t.iconalt),"type"in t&&s(6,p=t.type)},t.$$.update=()=>{1&t.$$.dirty&&h(o,"title",c.string()),16&t.$$.dirty&&h(n,"snapshot",c.alternatives().try(c.string(),null)),2&t.$$.dirty&&h(r,"icon",c.alternatives().try(c.string(),null)),32&t.$$.dirty&&h(l,"iconAlt",c.string()),64&t.$$.dirty&&h(p,"type",c.string().valid("url","text","javascript","css","html","shell","python","json")),33&t.$$.dirty&&s(3,i=l&&`${l} "${o}"`),68&t.$$.dirty&&p&&"url"!==p&&(a?.parentNode.host.classList.add("snippet",p),a?.parentNode.host.style.setProperty("--snippet-background",`url(${d("assets/images/snippet_snapshot.svg")})`)),20&t.$$.dirty&&n?.trim()&&a?.parentNode.host.style.setProperty("--snapshot",`url(${n})`)},[o,r,a,i,n,l,p,function(t){binding_callbacks[t?"unshift":"push"]((()=>{a=t,s(2,a)}))}]}class Item extends SvelteElement{constructor(t){super(),this.shadowRoot.innerHTML="<style>:host{display:flex;background:var(--snapshot) center/cover;background-color:rgba(var(--eggshell), 75%);padding:0.269em 0.606em;box-shadow:inset 0 0 1px 0 white}:host(.snippet){background-image:var(--snippet-background);background-size:400% auto}:host(.text.snippet){background-position:100% 25%}:host(.javascript.snippet){background-position:31.5% 25%}:host(.css.snippet){background-position:0 25%}:host(.html.snippet){background-position:65% 25%}:host(.shell.snippet){background-position:0 75%}:host(.python.snippet){background-position:31.5% 75%}:host(.json.snippet){background-position:65% 75%}.label{--x-padding:0.65em;display:inline-flex;justify-content:center;align-items:center;grid-gap:0.419em;gap:0.419em;background-color:rgba(var(--deepwater), 75%);height:1.688em;padding:0 var(--x-padding);box-sizing:border-box;border-radius:1em;box-shadow:0 0 1px 0 white;max-width:100%}.title{font-weight:bold;white-space:pre;text-transform:capitalize;line-height:1;overflow:hidden;text-overflow:ellipsis}img{--size:1.563em;width:var(--size);height:var(--size);border-radius:50%;-o-object-fit:contain;object-fit:contain;box-sizing:border-box;border:1px solid rgb(var(--sky));box-shadow:0 0 0 1px rgb(var(--space));margin-left:calc(-1 * var(--x-padding) + 1px);background-color:rgb(var(--eggshell))}</style>",init(this,{target:this.shadowRoot,props:attribute_to_object(this.attributes),customElement:!0},instance,create_fragment,not_equal,{title:0,snapshot:4,icon:1,iconalt:5,type:6},null),t&&(t.target&&insert(t.target,this,t.anchor),t.props&&(this.$set(t.props),flush()))}static get observedAttributes(){return["title","snapshot","icon","iconalt","type"]}get title(){return this.$$.ctx[0]}set title(t){this.$$set({title:t}),flush()}get snapshot(){return this.$$.ctx[4]}set snapshot(t){this.$$set({snapshot:t}),flush()}get icon(){return this.$$.ctx[1]}set icon(t){this.$$set({icon:t}),flush()}get iconalt(){return this.$$.ctx[5]}set iconalt(t){this.$$set({iconalt:t}),flush()}get type(){return this.$$.ctx[6]}set type(t){this.$$set({type:t}),flush()}}customElements.define("hdl-dashboard-item",Item);export default Item;