# BLOG APP Backend
Welcome to Blog App REST API documentation.

First of all, all the endpoints return a JSON datatype response and require cookies in order to send Json Web Tokens easily, automatically and securely thanks to httpOnly option. There are only 2 endpoints which don't require JWT and those are Register and Login endpoints. All the request data have to send via Body ( urlencoded ) expect JWT. JWTs're automatic thanks to cookies by default.

For documentation use [this](utkuearas/BlogAppBackend/blob/) postman json file
