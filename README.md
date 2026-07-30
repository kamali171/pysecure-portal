# PySecure Portal

Build a modern web application called "PySecure - Python Secure Assessment Portal" for colleges.

Modules:

1. Student Registration

2. Student Login

3. Student Dashboard

4. Faculty Dashboard

5. Admin Dashboard

6. Secure Exam Interface

7. AI Proctor Dashboard

8. Results & Analytics

Registration:

Collect First Name, Last Name, Gender, Date of Birth, Register Number, Department, Year, Section, Email, Phone Number, Password and Profile Photo.

Dashboard:

Show Upcoming Test, Previous Results, Performance Graph, Notifications and a prominent Start Test button.

Before starting an exam:

Create a professional System Compatibility Check page that verifies webcam, microphone, internet connection, fullscreen mode and Safe Exam Browser. If any check fails, disable the Start Exam button.

Exam Rules page:

Require students to accept rules stating webcam must remain on, no tab switching, no fullscreen exit, no mobile phone usage, no multiple persons, and automatic submission after repeated violations.

Exam Interface:

Show timer, question palette, webcam preview, warning counter, trust score, code editor, run code, submit, next, previous and hint button.

Question Features:

Each question belongs to a syllabus topic and is tagged internally as Easy, Medium or Hard. Students should only see the difficulty label, not choose it. Every question has an AI-generated hint.

Faculty Panel:

Faculty can create daily 1-hour Python tests by selecting syllabus topics and entering questions. The system automatically generates hints, expected output, sample test cases and assigns a difficulty level.

AI Monitoring:

Display live webcam feed and detect tab switching, fullscreen exit, no face, multiple faces, mobile phone usage, excessive head movement and browser close attempts. Maintain a trust score and auto-submit when violations exceed the allowed limit.

Theme:

Modern university design with KIOT branding, blue and white color palette, glassmorphism cards, responsive layout, smooth animations, clean typography and a professional examination experience similar to HackerRank.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/f4bb287d-7aa8-448e-9799-69527d77b352).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
