const input = document.getElementById("file_input")
const view = document.getElementById("view_input")
const typef = document.getElementById("typefile")
const notvalidcode = (nb) => {
    return `
<intr>./$></intr><func>output</func>()<br><br>
<intr>./$></intr><params> --Selected element not valid--\t->${nb + (nb==""?"":"--")} </params><br><br>
<intr>./$></intr><func>try_again</func>()${nb==""?"":"<br>"} 
`
}
const cancelcode = `
<intr>./$></intr><func>output</func>()<br><br>
<intr>./$></intr><params> --Cancelled-- </params>
`
const completecode = `
<intr>./$></intr><func>output</func>()<br><br>
<intr>./$></intr><params> --Success--</params><br><br>
<intr>./$></intr><func>click_and_load</func>()<br><br>
`
let renderings = []

view.addEventListener("click", () => renderings.length == 0 ? input.click() : renderings.map(link => link.click()))

input.addEventListener("change", async () => {
    view.innerHTML = ""
    if (!input.files || input.files.length <= 0)
        return view.innerHTML = notvalidcode("")
    for (const file of input.files) {
        const extension = file.name.split('.').pop().toLowerCase()
        console.log(extension)
        if (!["mexplo", "json"].includes(extension)) {
            view.innerHTML += notvalidcode(file.name)
            continue
        }
        const cont = await new Promise((resolve, reject) => {
            const reader = new FileReader()
            reader.onload = (e) => resolve(e.target.result)
            reader.onerror = reject
            reader.readAsText(file)
        })
        switch (typef.value) {
            case "fractal":
                try {
                    const fractaltorender = Fractal.fromJSON(cont)
                    renderings.push((() => {
                        const link = document.createElement("a")
                        link.href = "/view?from_file=" + encodeURIComponent(fractaltorender
                            .toJSON()) + "&type=fractal"
                        link.target = "_blank"
                        return link
                    })())
                    console.log(fractaltorender)
                } catch (e) {
                    view.innerHTML += notvalidcode(file.name)
                }
                break;
            default:
                view.innerHTML += notvalidcode(file.name)
                continue
        }
    }
    renderings.length > 0 ? view.innerHTML += completecode : ""
})
input.addEventListener("cancel", (e) => {
    view.innerHTML = cancelcode
})