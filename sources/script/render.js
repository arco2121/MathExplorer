
const canvas = document.getElementById('rendering');
const render = new BaseMathRender(canvas);

document.addEventListener("DOMContentLoaded", () => {
    render.addFunction(x => Math.sin(x), 3);
})
window.addEventListener("message", (e) => {
    switch(e.data.message)
    {
        case "zoomIn": return render.zoomIn()
        case "zoomOut": return render.zoomOut()
    }
})