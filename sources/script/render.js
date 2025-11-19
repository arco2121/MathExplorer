const canvas = document.getElementById('rendering');
const render = BaseMath.createFormulasRender(canvas);

document.addEventListener("DOMContentLoaded", () => {
    const y = BaseMath.createBaseFormula(x=>Math.sin(x),{color : "green"})
    render.addFormula(y)
})
window.addEventListener("message", (e) => {
    switch(e.data.message)
    {
        case "zoomIn": return render.zoomIn()
        case "zoomOut": return render.zoomOut()
    }
})