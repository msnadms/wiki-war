function createThemeState() {
    let theme = $state<'light' | 'dark'>('light');

    return {
        get value() { return theme; },
        init() {
            const stored = localStorage.getItem('theme');
            if (stored === 'dark' || stored === 'light') {
                theme = stored;
            } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
                theme = 'dark';
            }
        },
        toggle() {
            theme = theme === 'light' ? 'dark' : 'light';
            localStorage.setItem('theme', theme);
        }
    };
}

export const themeState = createThemeState();