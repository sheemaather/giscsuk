# GISC Computer Science Department Portal

Government Islamia Science College Sukkur
Department of Computer Science
BS Computer Science (4 Years / 8 Semesters)

## Stack
- HTML5
- CSS3
- Vanilla JavaScript
- Bootstrap 5
- Node.js + Express
- MySQL
- REST API

## Run
1. Install Node.js LTS and MySQL.
2. Create the database:
   `mysql -u root -p < database/database.sql`
3. Copy `.env.example` to `.env` and set database credentials.
4. Run:
   `npm install`
   `npm start`
5. Open `http://localhost:5000`

## Admin
`http://localhost:5000/admin/login.html`

Demo credentials after running the SQL:
- username: admin
- password: admin123

Change the password in production.

## Important
The API is prepared for future biometric attendance integration. A biometric device/SDK can later POST attendance events to:
`POST /api/attendance/checkin`

The supplied uploaded logo has been processed into a transparent PNG and is used by the website.
The college building photo was not present as a separate uploaded file in the project source, so `assets/images/building-placeholder.svg` is provided. Replace it with the actual building photo when available.
