let mode = 1 //1 for CPU, 2 for GPU

const render_frame = document.getElementById("render_frame")
const modeSel = document.getElementById("mode")

document.addEventListener("DOMContentLoaded", () => {
    if (!document.documentElement.getAttribute("default_fractal"))
        render_frame.contentWindow.postMessage({
            cmd: 'setFractalObjectDefault',
            fractal: document.documentElement.getAttribute("default_fractal")
        }, '*');
})

modeSel.addEventListener("change", () => {
    mode = modeSel.value
    render_frame.contentWindow.postMessage({
        cmd: 'renderMode',
        mode: mode
    }, '*');
})

window.addEventListener("message",(ev) => {
    const msg = ev.data;
    if (!msg) return;
    try {
        if (msg.cmd === 'loadedFractalObject') {
            if(msg.success) {
                console.log("Loaded")
            }
            else {
                render_frame.textContent = errormessage
            }
        } else if(msg.cmd === 'error')
        {
            render_frame.textContent = errormessage
        }
    }
    catch(e)
    {
        console.log(e)
        render_frame.textContent = e
    }
})