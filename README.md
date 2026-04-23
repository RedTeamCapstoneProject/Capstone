# Real News

A full-stack news aggregation and summarization web application that fetches current headlines, clusters related stories, generates AI summaries, stores the results in PostgreSQL, and exposes them through API endpoints for a frontend client.

# Purpose
The world is filled with a constant flood of news, and the ability to stay informed in today’s fast-paced world is a struggle for many people. Be it long, complex articles or watching out for bias, it leads people not to stay informed. The main objective of this project is to create a website that would summarize and explain news articles.

# Product Scope
The main objective of Real News is to create a website that summarizes and explains news articles. The website will provide users with an easy way to inform themselves in multiple ways. The platform generates summaries of submitted articles and features an interactive Q&A capability based on the content.  Users can tailor the article's AI  summary to match their unique needs(certain topics, certain complexity, etc), further increasing their efficiency.  The website will gather current and trending articles by scraping the web and using the NewsAPI, and then analyze them. The articles will be sorted by popularity and topic, making it easier for users to find relevant information. These groups of related articles are then summarized using artificial intelligence. The summarized groups and their corresponding topics are displayed on a user dashboard for easy browsing. Additional functionality is provided for each group, including options such as “explain like I’m 5” and “give me the five Ws.” The final deliverable will be a fully functional website that will be able to aggregate, analyze, sort, and then output news content in an easy, accessible way. 

# Project Features

- News Aggregation: Fetches trending news and displays them on the website 
- User Dashboard: Simple, easy navigation with articles that are organized by category
- Chatbot: Provides an interactive Q/A to answer any questions
- Unique Summaries: Summarizes articles in  “Explain like I'm 5” and “Give me the 5 W’s” 
- User Accounts: Allows for user to set preferences for article categories


# Operating Instructions

The website was built to be intuitive enough that minimal user doucmentation and instructions are needed. Users can peruse through the avabile articles and sort by topic on the tophand bar. They can also create an account to store preferences in article topics. Users can read an articles contents by cilcking "continue reading" and then use the available features mentioned. 

# Functions / How it works 

- Information Gathering: NewsAPI is called at midnight and trending articles are pulled and formed in three jsons
- Topic Agent Pipeline: Uses two AI agents to determine topics for each article to group into dynamic clusters and fact check each other’s decisions. 
- Summary Agents: Uses three different unique agents that takes the groups of articles and transforms them into formats: “Generic Summary”, “like I’m Five”, and  “Five W’s.”
- Storage: Store summaries and articles in a database in PostgreSQL
- Interactive Context Agent: Acts as a personal assistant to query about a specific news article. Uses the context of the article to keepstrict to article content

# Technical Approach

- Frontend: HTML/CSS/TypeScript (React)
- Backend: TypeScript (Node.js and Express.js)
- DBMS: PostgreSQL/Supabase
- Deployment/Hosting: Vercel

# Logic Structure
<img width="975" height="394" alt="image" src="https://github.com/user-attachments/assets/0023860d-6cdc-4860-8eab-c3187bb4755c" />

# Maintaing 
- API keys: Currently limited access to API calls so the website could be throttled in the future
- Report Button: If users encounter an error in an article description or in a feature, they can report it
- 

# Future Improvements

- Social Functionality: Allow for users to share and discuss articles 
- Wider Content Range: Expand the scope of articles that the website fetches from 
- Further Refinement: Further refine the chatbot and summarization if needed

