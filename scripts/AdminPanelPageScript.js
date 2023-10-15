document.getElementById('clients-portal').addEventListener('click', () => {
    window.location.href = '/clientsPortalPage';
});

document.getElementById('search-user').addEventListener('submit', (event) => {
    //Prevent the default form action
    event.preventDefault();

    //Retrieve the desired user's email
    const email = document.getElementById('email').value;
});