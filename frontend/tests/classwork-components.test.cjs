const test=require("node:test"),assert=require("node:assert/strict"),{renderToStaticMarkup}=require("react-dom/server");
const {bulkHarness,bulkMarkup,courseworkMarkup,find}=require("./helpers/classwork-render.cjs");
test("bulk invitations require a preview and send its revision only on explicit confirmation",async()=>{
 const h=bulkHarness();let tree=h.render();assert.doesNotMatch(renderToStaticMarkup(tree),/Send ready invitations/);
 find(tree,n=>n.props?.children==="Preview invitations").props.onClick();await new Promise(setImmediate);
 assert.equal(h.calls.length,1);assert.equal(h.calls[0][2],"preview");
 tree=h.render();const confirm=find(tree,n=>n.props?.onClick&&renderToStaticMarkup(n).includes("Send ready invitations"));confirm.props.onClick();await new Promise(setImmediate);
 assert.equal(h.calls[1][2],"commit");assert.equal(h.calls[1][3],"fixture-revision");assert.equal(h.slots[0],"");assert.equal(h.slots[1],null);assert.equal(h.slots[4],1);
});
test("CSV preview exposes invalid, duplicate and joined emails and supports Bengali",()=>{const html=bulkMarkup();for(const text of ["Invalid email","Duplicate email","Already joined","Invitation preview"])assert.ok(html.includes(text));assert.match(bulkMarkup("bn"),/আমন্ত্রণের প্রিভিউ/);});
test("student coursework shows feedback, rubric scores, missing work and the existing assignment route",()=>{const html=courseworkMarkup();for(const text of ["Explain the final step","Accuracy","80/100","Missing problem set","Missing","tab=classwork&amp;work=assignments"])assert.ok(html.includes(text),text);assert.match(courseworkMarkup("bn"),/ক্লাসের কাজ ও ফিডব্যাক/);});
