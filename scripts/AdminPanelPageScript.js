document.getElementById('clients-portal').addEventListener('click', () => {
    window.location.href = '/clientsPortalPage';
});

document.getElementById('search-user').addEventListener('submit', (event) => {
    //Prevent the default form action
    event.preventDefault();

    //Retrieve the desired user's email
    const email = document.getElementById('search-user-input').value;

    //Send a POST request to the server
    fetch('/searchUser', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: email }), //Indicate that we are sending JSON data in the request body
    })
        .then((response) => response.json()) //Parse the incoming JSON response
        .then((data) => {
            const serverMessageElement = document.getElementById('message');
            serverMessageElement.innerHTML = data.message;

            if (data.status === 'user_found') {
                setTimeout(() => {
                    //Add the functionality to display the user's data
                }, 1500); //Redirect to the user page after 1,5 seconds
            }
        })
        .catch((error) => {
            console.error('Error:', error);
        });
});