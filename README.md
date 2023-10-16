# Law Firm Cosmetics Consents

Welcome to our Law Firm's Cosmetics Consents platform. Designed exclusively for businesses and individuals seeking cosmetics-related legal consents, our platform offers an easy and efficient way to purchase individual consents or subscribe for online consent forms that can be filled and sent directly to your email.

## Table of Contents

- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Setting Up a Virtual Environment](#setting-up-a-virtual-environment)
  - [Installing Dependencies](#installing-dependencies)
  - [Database Setup](#database-setup)
- [Usage](#usage)
  - [Running the Web Scraper](#running-the-web-scraper)
  - [Summarizing News Articles](#summarizing-news-articles)
- [Contributing](#contributing)
- [License](#license)

## Getting Started

Follow these steps to set up and run CodeNews on your local machine.

### Prerequisites

- Node.js & npm installed
- MySQL server up and running

### Setting Up a Virtual Environment

1. Clone this repository:

   ```bash
   git clone https://github.com/NaviteLogger/Website-Production-Repo-Copy.git
   ```

2. Navigate to the project directory:

   ```bash
   cd CodeNews
   ```

3. Create a virtual environment (optional):

   ```bash
   python -m venv venv
   ```

4. Activate the virtual environment:

   ```bash
   source venv/bin/activate
   ```

### Install Dependencies

1. Install project dependencies:

   ```bash
   pip install -r requirements.txt
   ```

### Database Setup

1. Configure your MySQL database settings in `config.py`. Update the following fields with your database information:

```python
DB_CONFIG = {
    "host": "your_database_host",
    "user": "your_database_user",
    "password": "your_database_password",
    "database": "your_database_name",
}
```

2. Initialize the database schema by running the following command:

```bash
python init_db.py
```

## Usage

### Running the Web Scrapper:

1. Start the web scraping component to collect news articles:

```bash
python scraper.py
```

This script will periodically scrape news articles from selected sources and store them in the MySQL database for further processing.

2. Access the summarized news articles through your preferred frontend or API, which you can develop based on the project's needs.

## Contributing

Contributions are welcome! Feel free to submit issues, suggest improvements, or make pull requests to help enhance this project.

## License

<a rel="license" href="http://creativecommons.org/licenses/by-nc-sa/4.0/"><img alt="Creative Commons License" style="border-width:0" src="https://i.creativecommons.org/l/by-nc-sa/4.0/88x31.png" /></a><br />This work is licensed under a <a rel="license" href="http://creativecommons.org/licenses/by-nc-sa/4.0/">Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License</a>.
