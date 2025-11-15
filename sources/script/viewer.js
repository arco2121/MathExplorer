let mode = 1 //1 for CPU, 2 for GPU, 3 for SVG

const render_frame = document.getElementById("render_frame")
const zoomIn = document.getElementById("zoomIn")
const zoomOut = document.getElementById("zoomOut")
const modeSel = document.getElementById("mode")

document.addEventListener("DOMContentLoaded", () => {
    if(!document.documentElement.getAttribute("default_fractal"))
    {
    }
})

zoomIn.onclick = () => render_frame.contentWindow.postMessage({
    message: "zoomIn"
})
zoomOut.onclick = () => render_frame.contentWindow.postMessage({
    message: "zoomOut"
})

window.addEventListener("message",(e) => {
   
})