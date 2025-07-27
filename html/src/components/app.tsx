import { h, Component } from 'preact';

import { ITerminalOptions, ITheme } from 'xterm';
import { ClientOptions, Xterm } from './terminal';

if ((module as any).hot) {
    // tslint:disable-next-line:no-var-requires
    require('preact/debug');
}

const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
const path = window.location.pathname.replace(/[\/]+$/, '');
const wsUrl = [protocol, '//', window.location.host, path, '/ws', window.location.search].join('');
const tokenUrl = [window.location.protocol, '//', window.location.host, path, '/token'].join('');
const clientOptions = {
    rendererType: 'webgl',
    disableLeaveAlert: false,
    disableResizeOverlay: false,
    titleFixed: null,
} as ClientOptions;
const termOptions = {
    fontSize: 13,
    fontFamily: 'Menlo For Powerline,Consolas,Liberation Mono,Menlo,Courier,monospace',
    macOptionClickForcesSelection: true,
    macOptionIsMeta: true,
    theme: {
        foreground: '#d2d2d2',
        background: '#2b2b2b',
        cursor: '#adadad',
        black: '#000000',
        red: '#d81e00',
        green: '#5ea702',
        yellow: '#cfae00',
        blue: '#427ab3',
        magenta: '#89658e',
        cyan: '#00a7aa',
        white: '#dbded8',
        brightBlack: '#686a66',
        brightRed: '#f54235',
        brightGreen: '#99e343',
        brightYellow: '#fdeb61',
        brightBlue: '#84b0d8',
        brightMagenta: '#bc94b7',
        brightCyan: '#37e6e8',
        brightWhite: '#f1f1f0',
    } as ITheme,
} as ITerminalOptions;

interface State {
    showMenu: boolean;
    showRz: boolean;
    showSz: boolean;
    isAuthenticated: boolean;
    authCredentials: string | null;
}

const state = { showRz: false, showSz: false, showMenu: false, isAuthenticated: false, authCredentials: null };

export class App extends Component {
    private xtermRef: Xterm | null = null;

    constructor(props) {
        super(props);
        this.state = { ...state };
    }

    componentDidMount() {
        // Check if credentials are already stored in sessionStorage
        const storedCredentials = sessionStorage.getItem('cloudtty_auth_credentials');
        if (storedCredentials) {
            this.setState({ authCredentials: storedCredentials, isAuthenticated: true });
        } else {
            this.showLoginDialog();
        }
    }

    showLoginDialog = () => {
        // Create a modal dialog for better UX
        const modal = document.createElement('div');
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1000;
        `;

        const dialog = document.createElement('div');
        dialog.style.cssText = `
            background: #2b2b2b;
            color: #d2d2d2;
            padding: 30px;
            border-radius: 8px;
            min-width: 300px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
        `;

        dialog.innerHTML = `
            <h2 style="margin: 0 0 20px 0; text-align: center;">Authentication Required</h2>
            <div style="margin-bottom: 15px;">
                <label style="display: block; margin-bottom: 5px;">Username:</label>
                <input type="text" id="username" placeholder="Enter your username" style="width: 100%; padding: 8px; border: 1px solid #555; border-radius: 4px; background: #1e1e1e; color: #d2d2d2; box-sizing: border-box;">
            </div>
            <div style="margin-bottom: 20px;">
                <label style="display: block; margin-bottom: 5px;">Password:</label>
                <input type="password" id="password" placeholder="Enter your password" style="width: 100%; padding: 8px; border: 1px solid #555; border-radius: 4px; background: #1e1e1e; color: #d2d2d2; box-sizing: border-box;">
            </div>
            <div style="text-align: center;">
                <button id="loginBtn" style="padding: 10px 20px; background: #427ab3; color: white; border: none; border-radius: 4px; cursor: pointer; margin-right: 10px;">Login</button>
                <button id="cancelBtn" style="padding: 10px 20px; background: #666; color: white; border: none; border-radius: 4px; cursor: pointer;">Cancel</button>
            </div>
        `;

        modal.appendChild(dialog);
        document.body.appendChild(modal);

        const usernameInput = dialog.querySelector('#username') as HTMLInputElement;
        const passwordInput = dialog.querySelector('#password') as HTMLInputElement;
        const loginBtn = dialog.querySelector('#loginBtn') as HTMLButtonElement;
        const cancelBtn = dialog.querySelector('#cancelBtn') as HTMLButtonElement;

        const handleLogin = () => {
            const username = usernameInput.value.trim();
            const password = passwordInput.value.trim();

            if (!username || !password) {
                alert('Please enter both username and password.');
                return;
            }

            // Create base64 encoded credentials
            const credentials = btoa(`${username}:${password}`);
            
            // Store credentials in sessionStorage
            sessionStorage.setItem('cloudtty_auth_credentials', credentials);
            
            this.setState({ authCredentials: credentials, isAuthenticated: true });
            
            document.body.removeChild(modal);
        };

        const handleCancel = () => {
            document.body.removeChild(modal);
            // Try again
            this.showLoginDialog();
        };

        loginBtn.addEventListener('click', handleLogin);
        cancelBtn.addEventListener('click', handleCancel);

        // Handle Enter key
        const handleKeyPress = (e: KeyboardEvent) => {
            if (e.key === 'Enter') {
                handleLogin();
            }
        };

        usernameInput.addEventListener('keypress', handleKeyPress);
        passwordInput.addEventListener('keypress', handleKeyPress);

        // Handle Tab key to move between fields
        usernameInput.addEventListener('keydown', (e: KeyboardEvent) => {
            if (e.key === 'Tab') {
                e.preventDefault();
                passwordInput.focus();
            }
        });

        passwordInput.addEventListener('keydown', (e: KeyboardEvent) => {
            if (e.key === 'Tab') {
                e.preventDefault();
                usernameInput.focus();
            }
        });

        // Focus on username input
        usernameInput.focus();
    };

    handleAuthFailure = () => {
        alert('Authentication failed. Please check your username and password.');
        // Clear stored credentials on authentication failure
        sessionStorage.removeItem('cloudtty_auth_credentials');
        this.setState({ isAuthenticated: false, authCredentials: null });
        this.showLoginDialog();
    };

    clearStoredCredentials = () => {
        sessionStorage.removeItem('cloudtty_auth_credentials');
        this.setState({ isAuthenticated: false, authCredentials: null });
        this.showLoginDialog();
    };

    toggleMenu = (v: boolean) => {
        this.setState({ showMenu: v });
    };

    hideSz = (v: boolean) => {
        this.setState({ showSz: v });
        this.toggleMenu(false);
    };
    hideRz = (v: boolean) => {
        this.setState({ showRz: v });
        this.toggleMenu(false);
    };
    render(_, { showRz, showSz, showMenu, isAuthenticated, authCredentials }: State) {
        if (!isAuthenticated) {
            return (
                <div style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; background: #2b2b2b; color: #d2d2d2;">
                    <div style="text-align: center;">
                        <h2>Authentication Required</h2>
                        <p>Please enter your credentials to continue.</p>
                        <button 
                            onClick={this.showLoginDialog}
                            style="padding: 10px 20px; background: #427ab3; color: white; border: none; border-radius: 4px; cursor: pointer; margin-right: 10px;"
                        >
                            Login
                        </button>
                        <button 
                            onClick={this.clearStoredCredentials}
                            style="padding: 10px 20px; background: #666; color: white; border: none; border-radius: 4px; cursor: pointer;"
                        >
                            Clear Stored Credentials
                        </button>
                    </div>
                </div>
            );
        }

        return (
            <div style="width: 100%; height: 100%">
                <div className="terminal-operator">
                    <div className="terminal-operator--target" onClick={() => this.toggleMenu(!showMenu)}>
                        <i class="iconfont icon-wrench"></i>
                    </div>
                    <ul class="terminal-operator--menu" style={{ display: showMenu ? 'block' : 'none' }}>
                        <li onClick={() => this.hideRz(true)}>
                            <i class="iconfont icon-upload" />
                            Upload
                        </li>

                        <li onClick={() => this.hideSz(true)}>
                            <i class="iconfont icon-download" />
                            Download
                        </li>
                        
                        <li onClick={this.clearStoredCredentials}>
                            <i class="iconfont icon-logout" />
                            Clear Credentials
                        </li>
                    </ul>
                </div>
                <Xterm
                    ref={ref => this.xtermRef = ref}
                    id="terminal-container"
                    wsUrl={wsUrl}
                    tokenUrl={tokenUrl}
                    clientOptions={clientOptions}
                    termOptions={termOptions}
                    showRz={showRz}
                    showSz={showSz}
                    hideDownload={this.hideSz}
                    hideUpload={this.hideRz}
                    authCredentials={authCredentials}
                    onAuthFailure={this.handleAuthFailure}
                />
            </div>
        );
    }
}
