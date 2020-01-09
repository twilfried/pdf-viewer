export default class WebViewer {
    init = (source, element) => {
        new window.PDFTron.WebViewer({
            path: '/WebViewer/lib',
            initialDoc: source,
            disabledElements: [
                'viewControlsButton',
                'viewControlsOverlay',
                'leftPanelButton'
            ]
        }, element);
    }
}