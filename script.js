class TaskManager {
    constructor() {
        this.tasks = JSON.parse(localStorage.getItem('tasks')) || [];
        this.currentFilter = 'all';
        this.init();
        this.initTheme();
    }

    init() {
        // DOM Elements
        this.taskList = document.getElementById('taskList');
        this.taskTitle = document.getElementById('taskTitle');
        this.taskDescription = document.getElementById('taskDescription');
        this.taskDeadline = document.getElementById('taskDeadline');
        this.addTaskBtn = document.getElementById('addTask');
        this.filterBtns = document.querySelectorAll('.filter-btn');

        // Event Listeners
        this.addTaskBtn.addEventListener('click', () => this.addTask());
        this.filterBtns.forEach(btn => {
            btn.addEventListener('click', (e) => this.filterTasks(e));
        });

        this.renderTasks();
    }

    initTheme() {
        const savedTheme = localStorage.getItem('theme') || 'default';
        const savedCustomTheme = localStorage.getItem('customTheme');
        
        if (savedTheme === 'custom' && savedCustomTheme) {
            const customTheme = JSON.parse(savedCustomTheme);
            Object.entries(customTheme).forEach(([property, value]) => {
                document.documentElement.style.setProperty(property, value);
            });
        }

        const themeBtn = document.getElementById('themeToggle');
        themeBtn.addEventListener('click', () => {
            themeBtn.classList.toggle('active');
        });

        document.addEventListener('click', (e) => {
            if (!themeBtn.contains(e.target)) {
                themeBtn.classList.remove('active');
            }
        });

        this.initColorPicker();
    }

    initColorPicker() {
        const colorInput = document.getElementById('primaryColor');
        let isChanging = false;

        // Load saved custom theme if exists
        const savedCustomTheme = localStorage.getItem('customTheme');
        if (savedCustomTheme) {
            const theme = JSON.parse(savedCustomTheme);
            colorInput.value = theme['--primary-color'];
        } else {
            colorInput.value = '#4CAF50';
        }

        // Apply theme with debounce
        colorInput.addEventListener('input', () => {
            if (!isChanging) {
                isChanging = true;
                this.applyCustomTheme();
                setTimeout(() => {
                    isChanging = false;
                }, 1000); // Lock color changes for 2 seconds
            }
        });
    }

    // Task Management Methods
    addTask() {
        if (!this.taskTitle.value.trim()) return;

        const task = {
            id: Date.now(),
            title: this.taskTitle.value,
            description: this.taskDescription.value,
            deadline: this.taskDeadline.value ? new Date(this.taskDeadline.value).toISOString() : null,
            completed: false,
            important: false,
            createdAt: new Date()
        };

        this.tasks.push(task);
        this.saveTasks();
        this.renderTasks();
        this.clearForm();
    }

    toggleTask(id) {
        const task = this.tasks.find(task => task.id === id);
        if (task) {
            task.completed = !task.completed;
            this.saveTasks();
            this.renderTasks();
        }
    }

    toggleImportant(id) {
        const task = this.tasks.find(task => task.id === id);
        if (task) {
            task.important = !task.important;
            this.saveTasks();
            this.renderTasks();
        }
    }

    deleteTask(id) {
        this.tasks = this.tasks.filter(task => task.id !== id);
        this.saveTasks();
        this.renderTasks();
    }

    // Task Display Methods
    getFilteredTasks() {
        let filteredTasks;
        switch (this.currentFilter) {
            case 'completed':
                filteredTasks = this.tasks.filter(task => task.completed);
                break;
            case 'pending':
                filteredTasks = this.tasks.filter(task => !task.completed);
                break;
            default:
                filteredTasks = this.tasks;
        }
        
        // Sort tasks: important first, then by creation date
        return filteredTasks.sort((a, b) => {
            if (a.important !== b.important) {
                return b.important ? 1 : -1;
            }
            return new Date(b.createdAt) - new Date(a.createdAt);
        });
    }

    renderTasks() {
        const filteredTasks = this.getFilteredTasks();
        this.taskList.innerHTML = filteredTasks.length === 0 ? 
            '<div class="task-item">No tasks found</div>' : 
            filteredTasks.map(task => this.createTaskElement(task)).join('');
    }

    createTaskElement(task) {
        const deadlineText = task.deadline ? `
            <div class="deadline ${this.isOverdue(task.deadline) ? 'overdue' : ''}">
                <span>${this.formatDeadline(task.deadline)}</span>
                <span class="countdown">${this.getCountdown(task.deadline)}</span>
            </div>
        ` : '';

        const taskElement = document.createElement('div');
        taskElement.className = `task-item ${task.completed ? 'completed' : ''} ${task.important ? 'important' : ''}`;
        taskElement.innerHTML = `
            <div class="task-content">
                <div class="task-status">✓</div>
                <div class="task-text">
                    <h3>${this.escapeHtml(task.title)}</h3>
                    <p>${this.escapeHtml(task.description)}</p>
                    ${deadlineText}
                </div>
            </div>
            <div class="task-actions">
                <button class="important-btn ${task.important ? 'active' : ''}" 
                        onclick="taskManager.toggleImportant(${task.id})">⭐</button>
                <button onclick="taskManager.toggleTask(${task.id})">
                    ${task.completed ? 'Undo' : 'Complete'}
                </button>
                <button class="edit-btn" onclick="taskManager.editTask(${task.id})">Edit</button>
                <button class="delete-btn" onclick="taskManager.deleteTask(${task.id})">Delete</button>
            </div>
        `;

        return taskElement.outerHTML;
    }

    // Utility Methods
    formatDeadline(deadline) {
        if (!deadline) return '';
        const date = new Date(deadline);
        return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
    }

    getCountdown(deadline) {
        if (!deadline) return '';
        const timeDiff = new Date(deadline) - new Date();
        if (timeDiff < 0) return 'Overdue';

        const days = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((timeDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));

        return `${days > 0 ? `${days}d ` : ''}${hours > 0 ? `${hours}h ` : ''}${minutes}m`;
    }

    isOverdue(deadline) {
        return deadline && new Date(deadline) < new Date();
    }

    escapeHtml(text) {
        return text.replace(/[&<>"']/g, char => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        }[char]));
    }

    saveTasks() {
        localStorage.setItem('tasks', JSON.stringify(this.tasks));
    }

    clearForm() {
        this.taskTitle.value = '';
        this.taskDescription.value = '';
        this.taskDeadline.value = '';
    }

    filterTasks(e) {
        this.filterBtns.forEach(btn => btn.classList.remove('active'));
        e.target.classList.add('active');
        this.currentFilter = e.target.dataset.filter;
        this.renderTasks();
    }

    editTask(id) {
        const task = this.tasks.find(task => task.id === id);
        if (task) {
            const newTitle = prompt('Edit task title:', task.title);
            const newDescription = prompt('Edit task description:', task.description);
            
            // Format current deadline for display if it exists
            let currentDeadline = '';
            if (task.deadline) {
                const date = new Date(task.deadline);
                // Format for datetime-local input
                const year = date.getFullYear();
                const month = String(date.getMonth() + 1).padStart(2, '0');
                const day = String(date.getDate()).padStart(2, '0');
                const hours = String(date.getHours()).padStart(2, '0');
                const minutes = String(date.getMinutes()).padStart(2, '0');
                currentDeadline = `${year}-${month}-${day}T${hours}:${minutes}`;
            }
            
            const newDeadline = prompt('Edit deadline (YYYY-MM-DD HH:mm or leave empty):', currentDeadline);
            
            if (newTitle !== null && newTitle.trim() !== '') {
                task.title = newTitle;
                task.description = newDescription || '';
                if (newDeadline) {
                    const date = new Date(newDeadline);
                    if (!isNaN(date.getTime())) {
                        task.deadline = date.toISOString();
                    }
                } else {
                    task.deadline = null;
                }
                this.saveTasks();
                this.renderTasks();
            }
        }
    }

    applyCustomTheme() {
        const color = document.getElementById('primaryColor').value;
        const textColor = this.getContrastColor(color);
        const lighterColor = this.adjustBrightness(color, 30);
        const darkerColor = this.adjustBrightness(color, -10);

        const customTheme = {
            '--primary-color': color,
            '--primary-hover': darkerColor,
            '--text-color': textColor,
            '--bg-color': lighterColor,
            '--card-bg': '#ffffff',
            '--border-color': darkerColor,
            '--accent-color': color,
            '--button-text-color': '#ffffff',
            '--delete-color': '#ff4444'
        };

        // Apply theme changes immediately
        Object.entries(customTheme).forEach(([property, value]) => {
            document.documentElement.style.setProperty(property, value);
        });
        localStorage.setItem('customTheme', JSON.stringify(customTheme));
        localStorage.setItem('theme', 'custom');
    }

    getContrastColor(hexcolor) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hexcolor);
        if (!result) return '#000000';
        
        const r = parseInt(result[1], 16);
        const g = parseInt(result[2], 16);
        const b = parseInt(result[3], 16);
        
        // Calculate relative luminance
        const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
        
        // Return black for light backgrounds and white for dark backgrounds
        return luminance > 0.6 ? '#000000' : '#ffffff';
    }

    adjustBrightness(hex, percent) {
        const num = parseInt(hex.replace('#', ''), 16);
        const amt = Math.round(2.55 * percent);
        const R = (num >> 16) + amt;
        const G = (num >> 8 & 0x00FF) + amt;
        const B = (num & 0x0000FF) + amt;

        return '#' + (0x1000000 +
            (R < 255 ? (R < 1 ? 0 : R) : 255) * 0x10000 +
            (G < 255 ? (G < 1 ? 0 : G) : 255) * 0x100 +
            (B < 255 ? (B < 1 ? 0 : B) : 255)
        ).toString(16).slice(1);
    }
}

const taskManager = new TaskManager(); 