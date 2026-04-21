# Real News

A full-stack news aggregation and summarization app that fetches current headlines, clusters related stories, generates AI summaries, stores the results in PostgreSQL, and exposes them through API endpoints for a frontend client.

## What This Project Does

- News Aggregation: Fetches trending news and displays them on the website 
- User Dashboard:  Simple, easy navigation with articles that are organized by category
- Chatbot: provides an interactive Q/A to answer any questions
- Unique Summaries: Summarizes articles in  “Explain like I'm 5” and “Give me the 5 W’s” 
- User Accounts: Allows for user to set preferences for article categories

# How it works 

- Topic Agent Pipeline: Uses two AI agents to determine topics for each article to group into dynamic clusters and fact check each other’s decisions. 
- Summary Agents: Uses three different unique agents that takes the groups of articles and transforms them into formats: “Generic Summary”, “like I’m Five”, and  “Five W’s.”
- Interactive Context Agent: Acts as a personal assistant to query about a specific news article. Uses the context of the article to keepstrict to article content

# Technical Approach

- Frontend: HTML/CSS/TypeScript (React)
- Backend: TypeScript (Node.js and Express.js)
- DBMS: PostgreSQL/Supabase
- Deployment/Hosting: Vercel

# Logic Structure
<img width="975" height="394" alt="image" src="https://github.com/user-attachments/assets/0023860d-6cdc-4860-8eab-c3187bb4755c" />
