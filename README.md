# Mini Facebook - Social Network(V1)

A full-stack social networking platform with authentication, posts, and friend system.

## Live Demo
https://minifacebook-production.up.railway.app/auth

## Features
- User authentication (signup/login with JWT)
- Create, edit, delete posts
- Friend request system (send, accept, cancel)
- Feed filtering (all posts vs friends only)
- User profiles
- Real-time error handling

## Tech Stack
- **Backend:** Node.js, Express.js
- **Database:** MongoDB, Mongoose
- **Frontend:** EJS, Bootstrap, Vanilla JavaScript
- **Auth:** JWT, bcrypt
- **Deployment:** Railway, MongoDB Atlas

## Screenshots
<img width="944" height="418" alt="Screenshot 2025-11-02 161212" src="https://github.com/user-attachments/assets/52004c19-439c-40b0-bdac-ed4f2c96abd9" />
<img width="927" height="590" alt="Screenshot 2025-11-02 161258" src="https://github.com/user-attachments/assets/2a4db9f6-c0bb-4166-b1cf-f40525c3f05e" />
<img width="952" height="596" alt="Screenshot 2025-11-02 161338" src="https://github.com/user-attachments/assets/4219728d-cc0a-4287-91ce-b6ebbb7f2b2b" />
<img width="950" height="593" alt="Screenshot 2025-11-02 161354" src="https://github.com/user-attachments/assets/a47ba4b6-1bb3-40b1-9d97-ca3f164d37a2" />
<img width="955" height="591" alt="Screenshot 2025-11-02 161404" src="https://github.com/user-attachments/assets/f8c764b4-8137-4676-aa86-bd0963d80828" />
<img width="953" height="591" alt="Screenshot 2025-11-02 161416" src="https://github.com/user-attachments/assets/3bb1746c-94ad-46f5-bd99-025cd2ff3d27" />


## Local Setup
```bash
npm install
# Add .env with MONGO_URI and SECRET_KEY
npm start
```

## What I Learned
- Complex database relationships (users, posts, friend requests)
- Authentication & authorization
- Session management with transactions
- UX design and Bootstrap integration
- Error handling and user feedback

## Challenges I Faced
- Stuck on mongoose queries multiple time and found no proper solution. Tried to resolve for an hour by trying different things. Suddenly got the idea and it worked. It was actually pretty simple probability i didnt consider
- Structuring the whole project was little bit tricky cuz i didnt wanna take help from AI tool except for repetative tasks
- Was using 3 queries when friend request is accepted. But this was giving me issues of inconsistant data because if 1 of 3 queries face any error, data would be different accross DB for the same instance.

## Goal For V2
- Adding mutual logic (Friend)
- Adding file upload feature (Cloudinary)
- Completing user profile (Displaying post, addition of profile + cover picture)
- Integrating solid password checks
- Story Upload
