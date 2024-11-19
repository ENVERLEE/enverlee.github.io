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
    // Project details
    $(document).on('click', '.view-project', async function() {
        const projectId = $(this).closest('.project-card').data('project-id');
        try {
            const project = await api.getProject(projectId);
            $('#projectTitle').text(project.title)
                            .data('project-id', projectId); // Store project ID in the title element
            $('#projectDescription').text(project.description);
            
            const steps = await api.getProjectSteps(projectId);
            const stepsList = $('#stepsList');
            stepsList.empty();
            
            steps.forEach((step, index) => {
                stepsList.append(`
                    <button class="list-group-item list-group-item-action step-item ${index === 0 ? 'active' : ''}"
                            data-step="${index + 1}"
                            data-project-id="${projectId}">
                        Step ${index + 1}: ${step.status}
                    </button>
                `);
            });

            // Automatically load first step details
            if (steps.length > 0) {
                loadStepDetails(projectId, 1);
            }
            
            showPage('projectDetails');
        } catch (error) {
            showToast(error.message, true);
        }
    });

    // Function to load step details
    async function loadStepDetails(projectId, stepNumber) {
        try {
            const step = await api.getStepDetails(projectId, stepNumber);
            $('#stepTitle').text(`Step ${stepNumber}`);
            $('#stepForm')
                .data('project-id', projectId)
                .data('step-number', stepNumber);
            $('#stepForm [name="description"]').val(step.description || '');
            $('#stepForm [name="keywords"]').val(Array.isArray(step.keywords) ? step.keywords.join(', ') : '');
            $('#stepForm [name="methodology"]').val(step.methodology || '');
            $('#stepForm [name="output_format"]').val(step.output_format || '');
        } catch (error) {
            showToast(`Error loading step details: ${error.message}`, true);
        }
    }

    // Step management
    $(document).on('click', '.step-item', async function() {
        const stepNumber = $(this).data('step');
        const projectId = $(this).data('project-id');
        
        $('.step-item').removeClass('active');
        $(this).addClass('active');
        
        await loadStepDetails(projectId, stepNumber);
    });

    $('#stepForm').on('submit', async (e) => {
        e.preventDefault();
        const projectId = $('#stepForm').data('project-id');
        const stepNumber = $('#stepForm').data('step-number');
        
        try {
            const formData = new FormData(e.target);
            const data = Object.fromEntries(formData);
            data.keywords = data.keywords.split(',').map(k => k.trim()).filter(k => k);
            
            await api.updateStep(projectId, stepNumber, data);
            showToast('Step updated successfully');
            
            // Refresh step list to show updated status
            const steps = await api.getProjectSteps(projectId);
            const currentStep = steps.find(s => s.step_number === stepNumber);
            $(`.step-item[data-step="${stepNumber}"]`).text(`Step ${stepNumber}: ${currentStep.status}`);
        } catch (error) {
            showToast(`Error updating step: ${error.message}`, true);
        }
    });

    $('#executeStep').on('click', async () => {
        const projectId = $('#stepForm').data('project-id');
        const stepNumber = $('#stepForm').data('step-number');
        
        if (!projectId || !stepNumber) {
            showToast('Please select a step to execute', true);
            return;
        }
        
        try {
            const button = $('#executeStep');
            button.prop('disabled', true).text('Executing...');
            
            await api.executeStep(projectId, stepNumber);
            showToast('Step execution started successfully');
            
            // Refresh step details and status
            await loadStepDetails(projectId, stepNumber);
            
            // Refresh step list to show updated status
            const steps = await api.getProjectSteps(projectId);
            const currentStep = steps.find(s => s.step_number === stepNumber);
            $(`.step-item[data-step="${stepNumber}"]`).text(`Step ${stepNumber}: ${currentStep.status}`);
        } catch (error) {
            showToast(`Error executing step: ${error.message}`, true);
        } finally {
            $('#executeStep').prop('disabled', false).text('Execute Step');
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
