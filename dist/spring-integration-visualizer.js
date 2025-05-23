(async function(window, document) {

    const loadScript = (src) => {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = src;
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    };

    const loadStylesheet = (href) => {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = href;
        document.head.appendChild(link);
    };

    const addBodyStyles = () => {
        const style = document.createElement('style');
        style.textContent = `
                body {
                    background-color: #121212;
                }
            `;
        document.head.appendChild(style);
    };

     window.renderIntegrationGraph = async function(url, targetDivId) {
         loadStylesheet('https://maxcdn.bootstrapcdn.com/bootstrap/4.5.2/css/bootstrap.min.css');
         await loadScript('https://cdn.jsdelivr.net/npm/mermaid/dist/mermaid.min.js');
         await loadScript('https://cdnjs.cloudflare.com/ajax/libs/d3/6.7.0/d3.min.js');
         addBodyStyles();
        const targetElement = document.getElementById(targetDivId);
        if (!targetElement) {
            console.error(`Element with ID "${targetDivId}" not found.`);
            return;
        }

        mermaid.initialize({
            startOnLoad: false,
            theme: 'dark',
            themeVariables: {
                primaryColor: '#1e1e1e',
                primaryTextColor: '#fff',
                lineColor: '#fff',
                tertiaryColor: '#fff',
                mainBkg: '#1e1e1e',
            },
        });

        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`Failed to fetch graph definition: ${response.statusText}`);
            }
            const graphDefinition = await response.text();
            const graphDefinitionObj = JSON.parse(graphDefinition);
            let out = 'flowchart TB;\n';

            const map = graphDefinitionObj['nodes'].reduce((n, obj) => {
                n[obj.nodeId] = obj;
                return n;
            }, {});

            graphDefinitionObj.links.forEach((link) => {
                const fromNode = map[link.from].name;
                const toNode = map[link.to].name;
                const type = link.type;
                const componentTo = map[link.to].componentType;
                const componentFrom = map[link.from].componentType;
                out += `${link.from}[${fromNode}\n${componentFrom}] --"${type}"--> ${link.to}[${toNode}\n${componentTo}]\n`;
            });

            const {
                svg
            } = await mermaid.render('graphDiv', out);
            targetElement.innerHTML = svg;

            const svgElement = d3.select(`#${targetDivId} svg`);
            svgElement.html('<g>' + svgElement.html() + '</g>');
            const inner = svgElement.select('g');
            const zoom = d3.zoom().on('zoom', (event) => {
                inner.attr('transform', event.transform);
            });
            svgElement.call(zoom);

            document.querySelectorAll('.node').forEach((block) => {
                const blockId = block.id.split('-')[1];
                block.addEventListener('mouseenter', () => findInboundAndOutbound(blockId, true));
                block.addEventListener('mouseleave', () => findInboundAndOutbound(blockId, false));
            });


            const paths = document.querySelectorAll('path');

            let inboundTimeouts = [];
            let outboundTimeouts = [];

            const findInboundAndOutbound = (blockId, highlight) => {
                let expandedInbound = [];
                let expandedOutbound = [];
                let inboundQueue = [blockId];
                let outboundQueue = [blockId];
                let visitedInbound = new Set();
                let visitedOutbound = new Set();

                inboundTimeouts.forEach(clearTimeout);
                outboundTimeouts.forEach(clearTimeout);
                inboundTimeouts = [];
                outboundTimeouts = [];

                while (inboundQueue.length > 0) {
                    console.log("inboundQueue", inboundQueue);
                    let currentId = inboundQueue.shift();
                    paths.forEach((path) => {
                        const pathIdSplit = path.id.split('_');
                        if (pathIdSplit[2] === currentId && !visitedInbound.has(path.id)) {
                            visitedInbound.add(path.id);
                            inboundQueue.push(pathIdSplit[1]);
                            expandedInbound.push(path);
                        }
                    });
                }

                while (outboundQueue.length > 0) {
                    console.log("outboundQueue", outboundQueue);
                    let currentId = outboundQueue.shift();
                    paths.forEach((path) => {
                        const pathIdSplit = path.id.split('_');
                        if (pathIdSplit[1] === currentId && !visitedOutbound.has(path.id)) {
                            visitedOutbound.add(path.id);
                            outboundQueue.push(pathIdSplit[2]);
                            expandedOutbound.push(path);
                        }
                    });
                }

                let delay = 0;

                expandedOutbound.forEach((path) => {
                    const timeout = setTimeout(() => {
                        path.style.stroke = highlight ? '#c183fe' : '#fff';
                        path.style.strokeWidth = highlight ? '4' : '1';
                    }, highlight ? delay : 0);
                    outboundTimeouts.push(timeout);
                    if (highlight) delay += 30;
                });

                expandedInbound.forEach((path) => {
                    const timeout = setTimeout(() => {
                        path.style.stroke = highlight ? '#c183fe' : '#fff';
                        path.style.strokeWidth = highlight ? '4' : '1';
                    }, highlight ? delay : 0);
                    inboundTimeouts.push(timeout);
                    if (highlight) delay += 30;
                });
            };
        } catch (error) {
            console.error('Error:', error);
        }
    };

})(window, document);
