
const canvas = document.getElementById('rendering');
const render = new SimpleRenderMathCanvas(canvas);

document.addEventListener("DOMContentLoaded", () => {
    render.addFunction(x => Math.sin(x), 2);
})