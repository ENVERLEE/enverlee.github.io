// Main application logic
$(document).ready(() => {
    const toast = new bootstrap.Toast($('.toast')[0]);
    const showToast = (message, isError = false) => {
        $('.toast-body').text(message);
        $('.toast').removeClass('bg-danger bg-success')
            .addClass(isError ? 'bg-danger' : 'bg-success');
        toast.show();
    };

    // Page management
    const showPage = (pageId) => {
        $('.container > div[id$="Page"]').addClass('d-none');
        $(`#${pageId}Page`).removeClass('d-none');
    };

    // Auth state management
    const updateAuthState = () => {
        const token = localStorage.getItem('token');
        if (token) {
            $('#authForms').addClass('d-none');
            $('.navbar-nav').removeClass('d-none');
            $('#userMenu').removeClass('d-none');
            showPage('projects');
            loadProjects();
        } else {
            $('#authForms').removeClass('d-none');
            $('.navbar-nav').addClass('d-none');
            $('#userMenu').addClass('d-none');
        }
    };

    // Form handlers
    $('#registerForm').on('submit', async (e) => {
        e.preventDefault();
        try {
            const formData = new FormData(e.target);
            const response = await api.register(Object.fromEntries(formData));
            api.setToken(response.access_token);
            showToast('Registration successful');
            updateAuthState();
        } catch (error) {
            showToast(error.message, true);
        }
    });

    $('#loginForm').on('submit', async (e) => {
        e.preventDefault();
        try {
            const formData = new FormData(e.target);
            const response = await api.login(Object.fromEntries(formData));
            api.setToken(response.access_token);
            showToast('Login successful');
            updateAuthState();
        } catch (error) {
            showToast(error.message, true);
        }
    });

    $('#logoutBtn').on('click', () => {
        api.clearToken();
        updateAuthState();
    });

    // Project management
    const loadProjects = async () => {
        try {
            const projects = await api.getProjects();
            const projectsList = $('#projectsList');
            projectsList.empty();

            projects.forEach(project => {
                const progress = (project.completed_steps / project.total_steps) * 100;
                const card = $(`
                    <div class="col-md-4">
                        <div class="card project-card" data-project-id="${project.id}">
                            <div class="card-body">
                                <h5 class="card-title">${project.title}</h5>
                                <p class="card-text">${project.description}</p>
                                <div class="progress mb-3">
                                    <div class="progress-bar" role="progressbar" 
                                         style="width: ${progress}%" 
                                         aria-valuenow="${progress}" 
                                         aria-valuemin="0" 
                                         aria-valuemax="100">
                                        ${progress.toFixed(0)}%
                                    </div>
                                </div>
                                <button class="btn btn-primary btn-sm view-project">
                                    View Details
                                </button>
                            </div>
                        </div>
                    </div>
                `);
                projectsList.append(card);
            });
        } catch (error) {
            showToast(error.message, true);
        }
    };

    $('#newProjectForm').on('submit', async (e) => {
        e.preventDefault();
        try {
            const formData = new FormData(e.target);
            await api.createProject(Object.fromEntries(formData));
            $('#newProjectModal').modal('hide');
            showToast('Project created successfully');
            loadProjects();
        } catch (error) {
            showToast(error.message, true);
        }
    });

    // Project details
    $(document).on('click', '.view-project', async function() {
        const projectId = $(this).closest('.project-card').data('project-id');
        try {
            const project = await api.getProject(projectId);
            $('#projectTitle').text(project.title);
            $('#projectDescription').text(project.description);
            
            const steps = await api.getProjectSteps(projectId);
            const stepsList = $('#stepsList');
            stepsList.empty();
            
            steps.forEach((step, index) => {
                stepsList.append(`
                    <button class="list-group-item list-group-item-action step-item"
                            data-step="${index + 1}">
                        Step ${index + 1}: ${step.status}
                    </button>
                `);
            });
            
            showPage('projectDetails');
        } catch (error) {
            showToast(error.message, true);
        }
    });

    // Step management
    $(document).on('click', '.step-item', async function() {
        const stepNumber = $(this).data('step');
        const projectId = $('#projectTitle').data('project-id');
        
        try {
            const step = await api.getStepDetails(projectId, stepNumber);
            $('#stepTitle').text(`Step ${stepNumber}`);
            $('#stepForm [name="description"]').val(step.description);
            $('#stepForm [name="keywords"]').val(step.keywords.join(', '));
            $('#stepForm [name="methodology"]').val(step.methodology);
            $('#stepForm [name="output_format"]').val(step.output_format);
            
            $('.step-item').removeClass('active');
            $(this).addClass('active');
        } catch (error) {
            showToast(error.message, true);
        }
    });

    $('#stepForm').on('submit', async (e) => {
        e.preventDefault();
        const projectId = $('#projectTitle').data('project-id');
        const stepNumber = $('.step-item.active').data('step');
        
        try {
            const formData = new FormData(e.target);
            const data = Object.fromEntries(formData);
            data.keywords = data.keywords.split(',').map(k => k.trim());
            
            await api.updateStep(projectId, stepNumber, data);
            showToast('Step updated successfully');
        } catch (error) {
            showToast(error.message, true);
        }
    });

    $('#executeStep').on('click', async () => {
        const projectId = $('#projectTitle').data('project-id');
        const stepNumber = $('.step-item.active').data('step');
        
        try {
            await api.executeStep(projectId, stepNumber);
            showToast('Step execution started');
        } catch (error) {
            showToast(error.message, true);
        }
    });

    // Reference search
    $('#referenceSearchForm').on('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const keywords = formData.get('keywords').split(',').map(k => k.trim());
        
        try {
            const references = await api.searchReferences({ keywords });
            const referencesList = $('#referencesList');
            referencesList.empty();
            
            references.forEach(ref => {
                referencesList.append(`
                    <div class="card mb-3">
                        <div class="card-body">
                            <h5 class="card-title">${ref.title}</h5>
                            <p class="card-text">${ref.abstract}</p>
                            <p class="card-text">
                                <small class="text-muted">
                                    ${ref.authors.join(', ')} (${ref.year})
                                </small>
                            </p>
                        </div>
                    </div>
                `);
            });
        } catch (error) {
            showToast(error.message, true);
        }
    });

    // Export handlers
    $('#exportDocx').on('click', async () => {
        const projectId = $('#projectTitle').data('project-id');
        try {
            await api.exportDocx(projectId);
            showToast('Export completed successfully');
        } catch (error) {
            showToast(error.message, true);
        }
    });

    // Initialize
    updateAuthState();
});
