# EduNexus file ও symbol map — backend

Source snapshot: [`88658db`](https://github.com/al-fardin/EduNexusF/tree/88658db216433a6acb46d3cbffead422735368a6).

এই index structural navigation-এর জন্য। প্রতিটি function/type-এর পাশে তার source line-এর permalink আছে।
Runtime registration পড়লে বোঝা যাবে কোন function কোন route-এ চলে। Blank line/import পুনরায় ব্যাখ্যা না করে মূল walkthrough-এর flow অনুসরণ করুন।

[মূল walkthrough](../guides/codebase-walkthrough-bn.md) · [Security ও judge প্রশ্ন](../guides/security-and-judge-bn.md)

## backend/apps/api

### [backend/apps/api/main.go](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/apps/api/main.go)

73 physical lines · **Source/config** · API bootstrap: config → PostgreSQL → JWT → Fiber → listen

[`main` L24](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/apps/api/main.go#L24)

## backend/apps/mobile-preview

### [backend/apps/mobile-preview/main.go](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/apps/mobile-preview/main.go)

101 physical lines · **Source/config** · main

[`gateway` L19](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/apps/mobile-preview/main.go#L19) · [`main` L81](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/apps/mobile-preview/main.go#L81)

### [backend/apps/mobile-preview/main_test.go](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/apps/mobile-preview/main_test.go)

51 physical lines · **Test** · Test

[`TestGatewayRoutesAndKeepsAuthentication` L11](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/apps/mobile-preview/main_test.go#L11)

## backend/apps/push-keys

### [backend/apps/push-keys/main.go](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/apps/push-keys/main.go)

31 physical lines · **Source/config** · main

[`main` L11](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/apps/push-keys/main.go#L11)

## backend/apps/set-role

### [backend/apps/set-role/main.go](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/apps/set-role/main.go)

116 physical lines · **Source/config** · main

[`main` L15](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/apps/set-role/main.go#L15)

## backend/docs

### [backend/docs/docs.go](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/docs/docs.go)

712 physical lines · **Generated** · Generated

[`init` L710](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/docs/docs.go#L710)

### [backend/docs/swagger.json](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/docs/swagger.json)

688 physical lines · **Generated** · Generated

### [backend/docs/swagger.yaml](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/docs/swagger.yaml)

458 physical lines · **Generated** · Generated

## backend

### [backend/go.mod](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/go.mod)

59 physical lines · **Source/config** · go

## backend/internal/activity

### [backend/internal/activity/context.go](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/activity/context.go)

17 physical lines · **Source/config** · context

[`SetActor` L11](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/activity/context.go#L11)

## backend/internal/auth/dto

### [backend/internal/auth/dto/change_password_request.go](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/auth/dto/change_password_request.go)

6 physical lines · **Source/config** · Request/response data contract: change_password_request

[`ChangePasswordRequest` L3](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/auth/dto/change_password_request.go#L3)

### [backend/internal/auth/dto/forgot_password_request.go](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/auth/dto/forgot_password_request.go)

5 physical lines · **Source/config** · Request/response data contract: forgot_password_request

[`ForgotPasswordRequest` L3](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/auth/dto/forgot_password_request.go#L3)

### [backend/internal/auth/dto/login_request.go](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/auth/dto/login_request.go)

7 physical lines · **Source/config** · Request/response data contract: login_request

[`LoginRequest` L3](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/auth/dto/login_request.go#L3)

### [backend/internal/auth/dto/login_response.go](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/auth/dto/login_response.go)

6 physical lines · **Source/config** · Request/response data contract: login_response

[`LoginResponse` L3](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/auth/dto/login_response.go#L3)

### [backend/internal/auth/dto/logout_all_request.go](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/auth/dto/logout_all_request.go)

3 physical lines · **Source/config** · Request/response data contract: logout_all_request

[`LogoutAllRequest` L3](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/auth/dto/logout_all_request.go#L3)

### [backend/internal/auth/dto/logout_request.go](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/auth/dto/logout_request.go)

5 physical lines · **Source/config** · Request/response data contract: logout_request

[`LogoutRequest` L3](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/auth/dto/logout_request.go#L3)

### [backend/internal/auth/dto/me_response.go](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/auth/dto/me_response.go)

14 physical lines · **Source/config** · Request/response data contract: me_response

[`MeResponse` L3](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/auth/dto/me_response.go#L3)

### [backend/internal/auth/dto/refresh_token_request.go](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/auth/dto/refresh_token_request.go)

5 physical lines · **Source/config** · Request/response data contract: refresh_token_request

[`RefreshTokenRequest` L3](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/auth/dto/refresh_token_request.go#L3)

### [backend/internal/auth/dto/refresh_token_response.go](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/auth/dto/refresh_token_response.go)

6 physical lines · **Source/config** · Request/response data contract: refresh_token_response

[`RefreshTokenResponse` L3](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/auth/dto/refresh_token_response.go#L3)

### [backend/internal/auth/dto/register_request.go](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/auth/dto/register_request.go)

10 physical lines · **Source/config** · Request/response data contract: register_request

[`RegisterRequest` L3](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/auth/dto/register_request.go#L3)

### [backend/internal/auth/dto/register_response.go](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/auth/dto/register_response.go)

17 physical lines · **Source/config** · Request/response data contract: register_response

[`RegisterResponse` L7](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/auth/dto/register_response.go#L7)

### [backend/internal/auth/dto/resend_verification_request.go](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/auth/dto/resend_verification_request.go)

5 physical lines · **Source/config** · Request/response data contract: resend_verification_request

[`ResendVerificationRequest` L3](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/auth/dto/resend_verification_request.go#L3)

### [backend/internal/auth/dto/reset_password_request.go](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/auth/dto/reset_password_request.go)

6 physical lines · **Source/config** · Request/response data contract: reset_password_request

[`ResetPasswordRequest` L3](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/auth/dto/reset_password_request.go#L3)

### [backend/internal/auth/dto/update_profile_request.go](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/auth/dto/update_profile_request.go)

8 physical lines · **Source/config** · Request/response data contract: update_profile_request

[`UpdateProfileRequest` L3](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/auth/dto/update_profile_request.go#L3)

### [backend/internal/auth/dto/verify_email_request.go](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/auth/dto/verify_email_request.go)

5 physical lines · **Source/config** · Request/response data contract: verify_email_request

[`VerifyEmailRequest` L3](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/auth/dto/verify_email_request.go#L3)

## backend/internal/auth/handler

### [backend/internal/auth/handler/forgot_password_handler.go](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/auth/handler/forgot_password_handler.go)

54 physical lines · **Source/config** · HTTP request/response adapter: forgot_password_handler

[`ForgotPassword` L22](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/auth/handler/forgot_password_handler.go#L22)

### [backend/internal/auth/handler/logout_all_handler.go](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/auth/handler/logout_all_handler.go)

45 physical lines · **Source/config** · HTTP request/response adapter: logout_all_handler

[`LogoutAll` L18](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/auth/handler/logout_all_handler.go#L18)

### [backend/internal/auth/handler/logout_handler.go](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/auth/handler/logout_handler.go)

47 physical lines · **Source/config** · HTTP request/response adapter: logout_handler

[`Logout` L20](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/auth/handler/logout_handler.go#L20)

### [backend/internal/auth/handler/me_handler.go](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/auth/handler/me_handler.go)

45 physical lines · **Source/config** · HTTP request/response adapter: me_handler

[`Me` L18](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/auth/handler/me_handler.go#L18)

### [backend/internal/auth/handler/resend_verification_handler.go](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/auth/handler/resend_verification_handler.go)

53 physical lines · **Source/config** · HTTP request/response adapter: resend_verification_handler

[`ResendVerification` L22](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/auth/handler/resend_verification_handler.go#L22)

### [backend/internal/auth/handler/reset_password_handler.go](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/auth/handler/reset_password_handler.go)

55 physical lines · **Source/config** · HTTP request/response adapter: reset_password_handler

[`ResetPassword` L21](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/auth/handler/reset_password_handler.go#L21)

### [backend/internal/auth/handler/user_handler.go](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/auth/handler/user_handler.go)

264 physical lines · **Source/config** · HTTP request/response adapter: user_handler

[`UserHandler` L12](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/auth/handler/user_handler.go#L12) · [`New` L16](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/auth/handler/user_handler.go#L16) · [`Register` L32](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/auth/handler/user_handler.go#L32) · [`Login` L79](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/auth/handler/user_handler.go#L79) · [`UpdateProfile` L128](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/auth/handler/user_handler.go#L128) · [`ChangePassword` L180](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/auth/handler/user_handler.go#L180) · [`Refresh` L229](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/auth/handler/user_handler.go#L229)

### [backend/internal/auth/handler/verify_email_handler.go](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/auth/handler/verify_email_handler.go)

55 physical lines · **Source/config** · HTTP request/response adapter: verify_email_handler

[`VerifyEmail` L21](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/auth/handler/verify_email_handler.go#L21)

## backend/internal/auth/middleware

### [backend/internal/auth/middleware/jwt_middleware.go](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/auth/middleware/jwt_middleware.go)

85 physical lines · **Source/config** · Request pipeline policy: jwt_middleware

[`SetJWTService` L13](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/auth/middleware/jwt_middleware.go#L13) · [`JWTProtected` L19](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/auth/middleware/jwt_middleware.go#L19)

### [backend/internal/auth/middleware/role_middleware.go](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/auth/middleware/role_middleware.go)

45 physical lines · **Source/config** · Request pipeline policy: role_middleware

[`RequireRole` L13](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/auth/middleware/role_middleware.go#L13)

## backend/internal/auth/repository

### [backend/internal/auth/repository/email_verification_repository.go](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/auth/repository/email_verification_repository.go)

76 physical lines · **Source/config** · Database query adapter: email_verification_repository

[`EmailVerificationRepository` L10](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/auth/repository/email_verification_repository.go#L10) · [`NewEmailVerificationRepository` L14](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/auth/repository/email_verification_repository.go#L14) · [`Create` L23](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/auth/repository/email_verification_repository.go#L23) · [`GetByToken` L34](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/auth/repository/email_verification_repository.go#L34) · [`VerifyToken` L45](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/auth/repository/email_verification_repository.go#L45) · [`MarkUserVerified` L56](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/auth/repository/email_verification_repository.go#L56) · [`DeleteUserTokens` L67](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/auth/repository/email_verification_repository.go#L67)

### [backend/internal/auth/repository/password_reset_repository.go](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/auth/repository/password_reset_repository.go)

65 physical lines · **Source/config** · Database query adapter: password_reset_repository

[`PasswordResetRepository` L10](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/auth/repository/password_reset_repository.go#L10) · [`NewPasswordResetRepository` L14](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/auth/repository/password_reset_repository.go#L14) · [`Create` L23](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/auth/repository/password_reset_repository.go#L23) · [`GetByToken` L34](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/auth/repository/password_reset_repository.go#L34) · [`UseToken` L45](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/auth/repository/password_reset_repository.go#L45) · [`DeleteUserTokens` L56](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/auth/repository/password_reset_repository.go#L56)

### [backend/internal/auth/repository/refresh_token_repository.go](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/auth/repository/refresh_token_repository.go)

50 physical lines · **Source/config** · Database query adapter: refresh_token_repository

[`RefreshTokenRepository` L10](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/auth/repository/refresh_token_repository.go#L10) · [`NewRefreshTokenRepository` L14](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/auth/repository/refresh_token_repository.go#L14) · [`Create` L20](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/auth/repository/refresh_token_repository.go#L20) · [`GetByToken` L28](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/auth/repository/refresh_token_repository.go#L28) · [`Revoke` L36](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/auth/repository/refresh_token_repository.go#L36) · [`RevokeAll` L44](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/auth/repository/refresh_token_repository.go#L44)

### [backend/internal/auth/repository/user_repository.go](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/auth/repository/user_repository.go)

86 physical lines · **Source/config** · Database query adapter: user_repository

[`UserRepository` L13](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/auth/repository/user_repository.go#L13) · [`New` L17](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/auth/repository/user_repository.go#L17) · [`CreateUser` L23](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/auth/repository/user_repository.go#L23) · [`GetUserByEmail` L30](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/auth/repository/user_repository.go#L30) · [`GetUserByID` L47](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/auth/repository/user_repository.go#L47) · [`UpdateUserProfile` L64](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/auth/repository/user_repository.go#L64) · [`UpdatePassword` L80](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/auth/repository/user_repository.go#L80)

## backend/internal/auth/routes

### [backend/internal/auth/routes/redteam_test.go](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/auth/routes/redteam_test.go)

37 physical lines · **Test** · Test

[`TestRedTeamEmailEndpointsThrottleWithoutTrustingForwardedIPs` L12](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/auth/routes/redteam_test.go#L12)

### [backend/internal/auth/routes/routes.go](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/auth/routes/routes.go)

83 physical lines · **Source/config** · routes

[`Register` L14](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/auth/routes/routes.go#L14) · [`authLimit` L76](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/auth/routes/routes.go#L76)

## backend/internal/auth/service

### [backend/internal/auth/service/account_security.go](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/auth/service/account_security.go)

518 physical lines · **Source/config** · Business logic: account_security

[`deviceKey` L30](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/auth/service/account_security.go#L30) · [`LoginContext` L32](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/auth/service/account_security.go#L32) · [`ConfigureSecurity` L35](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/auth/service/account_security.go#L35) · [`tokenHash` L36](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/auth/service/account_security.go#L36) · [`securePassword` L41](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/auth/service/account_security.go#L41) · [`mfaCipher` L74](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/auth/service/account_security.go#L74) · [`encryptMFA` L85](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/auth/service/account_security.go#L85) · [`decryptMFA` L96](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/auth/service/account_security.go#L96) · [`consumeFactor` L109](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/auth/service/account_security.go#L109) · [`secureLogin` L145](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/auth/service/account_security.go#L145) · [`secureRefresh` L207](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/auth/service/account_security.go#L207) · [`secureLogout` L268](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/auth/service/account_security.go#L268) · [`revokeAll` L290](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/auth/service/account_security.go#L290) · [`revokeAccount` L304](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/auth/service/account_security.go#L304) · [`RegisterSecurity` L315](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/auth/service/account_security.go#L315) · [`securityStatus` L327](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/auth/service/account_security.go#L327) · [`sessions` L339](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/auth/service/account_security.go#L339) · [`revokeSession` L362](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/auth/service/account_security.go#L362) · [`twoStep` L376](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/auth/service/account_security.go#L376)

### [backend/internal/auth/service/account_security_test.go](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/auth/service/account_security_test.go)

199 physical lines · **Test** · Test

[`securityFixture` L21](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/auth/service/account_security_test.go#L21) · [`TestSessionsRotateOnceAndRevokeAccessImmediately` L42](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/auth/service/account_security_test.go#L42) · [`TestAuthenticatorEncryptedRecoverySingleUseAndLockout` L90](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/auth/service/account_security_test.go#L90) · [`TestTwoStepEnrollmentCannotBeEnabledWithoutProof` L145](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/auth/service/account_security_test.go#L145)

### [backend/internal/auth/service/forgot_password_service.go](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/auth/service/forgot_password_service.go)

82 physical lines · **Source/config** · Business logic: forgot_password_service

[`ForgotPassword` L16](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/auth/service/forgot_password_service.go#L16)

### [backend/internal/auth/service/redteam_test.go](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/auth/service/redteam_test.go)

279 physical lines · **Test** · Test

[`TestRedTeamLegacyRefreshStillRotates` L16](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/auth/service/redteam_test.go#L16) · [`TestRedTeamVerificationRejectsExpiredUsedAndInactiveLinks` L31](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/auth/service/redteam_test.go#L31) · [`TestRedTeamRegistrationStoresOnlyVerificationDigest` L54](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/auth/service/redteam_test.go#L54) · [`recoveryMailbox` L85](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/auth/service/redteam_test.go#L85) · [`Send` L90](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/auth/service/redteam_test.go#L90) · [`TestRedTeamRefreshDigestCannotAuthenticateOrRevoke` L92](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/auth/service/redteam_test.go#L92) · [`TestRedTeamResendVerificationDoesNotEnumerateAccounts` L114](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/auth/service/redteam_test.go#L114) · [`TestRedTeamVerificationTokenIsHashedAndConsumedOnce` L138](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/auth/service/redteam_test.go#L138) · [`TestRedTeamPasswordRecoveryIsPrivateHashedAndSingleUse` L190](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/auth/service/redteam_test.go#L190) · [`TestRedTeamLegacyResetCompatibilityAndUsedTokenRejection` L262](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/auth/service/redteam_test.go#L262)

### [backend/internal/auth/service/reset_password_service.go](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/auth/service/reset_password_service.go)

61 physical lines · **Source/config** · Business logic: reset_password_service

[`ResetPassword` L16](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/auth/service/reset_password_service.go#L16)

### [backend/internal/auth/service/user_service.go](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/auth/service/user_service.go)

512 physical lines · **Source/config** · Business logic: user_service

[`UserService` L22](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/auth/service/user_service.go#L22) · [`New` L32](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/auth/service/user_service.go#L32) · [`Register` L51](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/auth/service/user_service.go#L51) · [`Login` L172](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/auth/service/user_service.go#L172) · [`Me` L233](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/auth/service/user_service.go#L233) · [`ChangePassword` L276](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/auth/service/user_service.go#L276) · [`UpdateProfile` L320](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/auth/service/user_service.go#L320) · [`Refresh` L378](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/auth/service/user_service.go#L378) · [`Logout` L463](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/auth/service/user_service.go#L463) · [`LogoutAll` L491](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/auth/service/user_service.go#L491)

### [backend/internal/auth/service/verification_link.go](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/auth/service/verification_link.go)

23 physical lines · **Source/config** · Business logic: verification_link

[`verificationPage` L11](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/auth/service/verification_link.go#L11)

### [backend/internal/auth/service/verification_link_test.go](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/auth/service/verification_link_test.go)

31 physical lines · **Test** · Test

[`TestVerificationPageUsesPublicOrigin` L5](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/auth/service/verification_link_test.go#L5)

### [backend/internal/auth/service/verify_email_service.go](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/auth/service/verify_email_service.go)

189 physical lines · **Source/config** · Business logic: verify_email_service

[`VerifyEmail` L21](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/auth/service/verify_email_service.go#L21) · [`consumeVerification` L75](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/auth/service/verify_email_service.go#L75) · [`ResendVerification` L113](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/auth/service/verify_email_service.go#L113)

## backend/internal/calling

### [backend/internal/calling/actions.go](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/calling/actions.go)

239 physical lines · **Source/config** · actions

[`action` L12](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/calling/actions.go#L12) · [`validSignal` L114](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/calling/actions.go#L114) · [`signal` L135](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/calling/actions.go#L135)

### [backend/internal/calling/calling.go](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/calling/calling.go)

297 physical lines · **Source/config** · calling

[`Handler` L18](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/calling/calling.go#L18) · [`Call` L19](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/calling/calling.go#L19) · [`Signal` L37](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/calling/calling.go#L37) · [`Register` L48](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/calling/calling.go#L48) · [`identity` L76](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/calling/calling.go#L76) · [`session` L83](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/calling/calling.go#L83) · [`result` L90](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/calling/calling.go#L90) · [`scan` L94](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/calling/calling.go#L94) · [`get` L99](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/calling/calling.go#L99) · [`expire` L109](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/calling/calling.go#L109) · [`active` L114](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/calling/calling.go#L114) · [`create` L132](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/calling/calling.go#L132) · [`respondCall` L224](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/calling/calling.go#L224) · [`history` L231](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/calling/calling.go#L231) · [`sync` L261](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/calling/calling.go#L261)

### [backend/internal/calling/calling_test.go](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/calling/calling_test.go)

121 physical lines · **Test** · Test

[`TestCallLifecycleIsolationAndPolicy` L16](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/calling/calling_test.go#L16) · [`TestSignalValidation` L112](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/calling/calling_test.go#L112)

### [backend/internal/calling/config.go](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/calling/config.go)

60 physical lines · **Source/config** · config

[`config` L14](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/calling/config.go#L14)

## backend/internal/classroom/dto

### [backend/internal/classroom/dto/classroom_member_response.go](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/classroom/dto/classroom_member_response.go)

19 physical lines · **Source/config** · Request/response data contract: classroom_member_response

[`ClassroomMemberResponse` L5](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/classroom/dto/classroom_member_response.go#L5)

### [backend/internal/classroom/dto/classroom_response.go](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/classroom/dto/classroom_response.go)

18 physical lines · **Source/config** · Request/response data contract: classroom_response

[`ClassroomResponse` L5](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/classroom/dto/classroom_response.go#L5)

### [backend/internal/classroom/dto/create_classroom_request.go](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/classroom/dto/create_classroom_request.go)

18 physical lines · **Source/config** · Request/response data contract: create_classroom_request

[`CreateClassroomRequest` L8](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/classroom/dto/create_classroom_request.go#L8)

### [backend/internal/classroom/dto/join_classroom_request.go](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/classroom/dto/join_classroom_request.go)

5 physical lines · **Source/config** · Request/response data contract: join_classroom_request

[`JoinClassroomRequest` L3](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/classroom/dto/join_classroom_request.go#L3)

### [backend/internal/classroom/dto/join_classroom_response.go](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/classroom/dto/join_classroom_response.go)

10 physical lines · **Source/config** · Request/response data contract: join_classroom_response

[`JoinClassroomResponse` L5](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/classroom/dto/join_classroom_response.go#L5)

### [backend/internal/classroom/dto/stream_dto.go](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/classroom/dto/stream_dto.go)

44 physical lines · **Source/config** · Request/response data contract: stream_dto

[`CreateAnnouncementRequest` L9](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/classroom/dto/stream_dto.go#L9) · [`UpdateAnnouncementRequest` L15](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/classroom/dto/stream_dto.go#L15) · [`StreamAuthorResponse` L21](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/classroom/dto/stream_dto.go#L21) · [`StreamPostResponse` L30](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/classroom/dto/stream_dto.go#L30)

### [backend/internal/classroom/dto/update_classroom_request.go](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/classroom/dto/update_classroom_request.go)

9 physical lines · **Source/config** · Request/response data contract: update_classroom_request

[`UpdateClassroomRequest` L3](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/classroom/dto/update_classroom_request.go#L3)

## backend/internal/classroom/handler

### [backend/internal/classroom/handler/classroom_handler.go](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/classroom/handler/classroom_handler.go)

348 physical lines · **Source/config** · HTTP request/response adapter: classroom_handler

[`ClassroomHandler` L13](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/classroom/handler/classroom_handler.go#L13) · [`New` L17](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/classroom/handler/classroom_handler.go#L17) · [`Create` L25](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/classroom/handler/classroom_handler.go#L25) · [`ListMine` L61](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/classroom/handler/classroom_handler.go#L61) · [`GetMine` L100](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/classroom/handler/classroom_handler.go#L100) · [`Update` L126](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/classroom/handler/classroom_handler.go#L126) · [`Archive` L163](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/classroom/handler/classroom_handler.go#L163) · [`Unarchive` L189](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/classroom/handler/classroom_handler.go#L189) · [`Delete` L215](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/classroom/handler/classroom_handler.go#L215) · [`pagination` L240](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/classroom/handler/classroom_handler.go#L240) · [`currentIdentity` L266](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/classroom/handler/classroom_handler.go#L266) · [`handleServiceError` L289](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/classroom/handler/classroom_handler.go#L289) · [`errorResponse` L337](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/classroom/handler/classroom_handler.go#L337)

### [backend/internal/classroom/handler/enrollment_import.go](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/classroom/handler/enrollment_import.go)

152 physical lines · **Source/config** · HTTP request/response adapter: enrollment_import

[`invitationImportRow` L17](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/classroom/handler/enrollment_import.go#L17) · [`parseInvitationCSV` L24](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/classroom/handler/enrollment_import.go#L24) · [`ImportInvitations` L65](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/classroom/handler/enrollment_import.go#L65)

### [backend/internal/classroom/handler/enrollment_import_test.go](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/classroom/handler/enrollment_import_test.go)

53 physical lines · **Test** · Test

[`TestInvitationCSVValidation` L11](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/classroom/handler/enrollment_import_test.go#L11) · [`TestBulkInvitationPreviewConsentAndStaleCommit` L22](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/classroom/handler/enrollment_import_test.go#L22)

### [backend/internal/classroom/handler/enrollment_invitations.go](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/classroom/handler/enrollment_invitations.go)

341 physical lines · **Source/config** · HTTP request/response adapter: enrollment_invitations

[`enrollmentOffset` L16](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/classroom/handler/enrollment_invitations.go#L16) · [`enrollmentPage` L23](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/classroom/handler/enrollment_invitations.go#L23) · [`normalizedInvitationEmail` L31](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/classroom/handler/enrollment_invitations.go#L31) · [`InviteStudent` L36](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/classroom/handler/enrollment_invitations.go#L36) · [`inviteEnrollment` L68](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/classroom/handler/enrollment_invitations.go#L68) · [`Invitations` L106](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/classroom/handler/enrollment_invitations.go#L106) · [`RevokeInvitation` L143](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/classroom/handler/enrollment_invitations.go#L143) · [`EnrollmentInbox` L180](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/classroom/handler/enrollment_invitations.go#L180) · [`RespondInvitation` L235](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/classroom/handler/enrollment_invitations.go#L235) · [`CancelJoinRequest` L300](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/classroom/handler/enrollment_invitations.go#L300)

### [backend/internal/classroom/handler/enrollment_mail.go](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/classroom/handler/enrollment_mail.go)

97 physical lines · **Source/config** · HTTP request/response adapter: enrollment_mail

[`invitationOrigin` L18](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/classroom/handler/enrollment_mail.go#L18) · [`ConfigureEnrollmentMail` L23](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/classroom/handler/enrollment_mail.go#L23) · [`sendEnrollmentMail` L45](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/classroom/handler/enrollment_mail.go#L45) · [`deliverInvitation` L69](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/classroom/handler/enrollment_mail.go#L69)

### [backend/internal/classroom/handler/enrollment_phase5.go](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/classroom/handler/enrollment_phase5.go)

270 physical lines · **Source/config** · HTTP request/response adapter: enrollment_phase5

[`EnrollmentPhase5` L19](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/classroom/handler/enrollment_phase5.go#L19) · [`NewEnrollmentPhase5` L25](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/classroom/handler/enrollment_phase5.go#L25) · [`phase5User` L30](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/classroom/handler/enrollment_phase5.go#L30) · [`phase5Error` L40](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/classroom/handler/enrollment_phase5.go#L40) · [`rollConflict` L43](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/classroom/handler/enrollment_phase5.go#L43) · [`validRoll` L47](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/classroom/handler/enrollment_phase5.go#L47) · [`lookupCodeRequest` L52](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/classroom/handler/enrollment_phase5.go#L52) · [`LookupCode` L56](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/classroom/handler/enrollment_phase5.go#L56) · [`joinPhase5Request` L86](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/classroom/handler/enrollment_phase5.go#L86) · [`Join` L91](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/classroom/handler/enrollment_phase5.go#L91) · [`MyRoll` L176](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/classroom/handler/enrollment_phase5.go#L176) · [`SetMyRoll` L196](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/classroom/handler/enrollment_phase5.go#L196) · [`GetCourseCode` L229](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/classroom/handler/enrollment_phase5.go#L229) · [`SetCourseCode` L245](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/classroom/handler/enrollment_phase5.go#L245)

### [backend/internal/classroom/handler/enrollment_policy.go](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/classroom/handler/enrollment_policy.go)

243 physical lines · **Source/config** · HTTP request/response adapter: enrollment_policy

[`enrollmentResult` L17](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/classroom/handler/enrollment_policy.go#L17) · [`RegisterEnrollment` L21](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/classroom/handler/enrollment_policy.go#L21) · [`teacher` L39](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/classroom/handler/enrollment_policy.go#L39) · [`lockEnrollmentTeacher` L54](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/classroom/handler/enrollment_policy.go#L54) · [`JoinSettings` L62](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/classroom/handler/enrollment_policy.go#L62) · [`submitJoinRequest` L106](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/classroom/handler/enrollment_policy.go#L106) · [`activateEnrollment` L142](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/classroom/handler/enrollment_policy.go#L142) · [`closePendingJoin` L155](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/classroom/handler/enrollment_policy.go#L155) · [`JoinRequests` L159](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/classroom/handler/enrollment_policy.go#L159) · [`ReviewJoinRequest` L191](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/classroom/handler/enrollment_policy.go#L191)

### [backend/internal/classroom/handler/enrollment_policy_test.go](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/classroom/handler/enrollment_policy_test.go)

372 physical lines · **Test** · Test

[`enrollmentApp` L25](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/classroom/handler/enrollment_policy_test.go#L25) · [`enrollmentCall` L51](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/classroom/handler/enrollment_policy_test.go#L51) · [`classCode` L71](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/classroom/handler/enrollment_policy_test.go#L71) · [`TestEnrollmentCreateIsAtomicAndDefaultsRemainDirect` L79](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/classroom/handler/enrollment_policy_test.go#L79) · [`TestApprovalDoesNotEnrollBeforeTeacherReviewAndRechecksExpiry` L109](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/classroom/handler/enrollment_policy_test.go#L109) · [`TestApprovalConcurrentRollConflictAndStudentWithdrawal` L152](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/classroom/handler/enrollment_policy_test.go#L152) · [`TestInvitationRequiresVerifiedRecipientAndBypassesExpiredCode` L198](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/classroom/handler/enrollment_policy_test.go#L198) · [`TestInvitationSignupExpiryRevocationAndDecline` L245](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/classroom/handler/enrollment_policy_test.go#L245) · [`invitationMailer` L278](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/classroom/handler/enrollment_policy_test.go#L278) · [`TestChangingPolicyDoesNotAutoEnrollAndArchivedClassRejectsInvitations` L282](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/classroom/handler/enrollment_policy_test.go#L282) · [`Send` L319](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/classroom/handler/enrollment_policy_test.go#L319) · [`TestInvitationMailRetriesEscapingAndRevokedLease` L320](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/classroom/handler/enrollment_policy_test.go#L320)

### [backend/internal/classroom/handler/institution_creation_test.go](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/classroom/handler/institution_creation_test.go)

36 physical lines · **Test** · Test

[`TestInstitutionPlacementErrorsDoNotCreatePartialClasses` L10](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/classroom/handler/institution_creation_test.go#L10)

### [backend/internal/classroom/handler/material_handler.go](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/classroom/handler/material_handler.go)

409 physical lines · **Source/config** · HTTP request/response adapter: material_handler

[`MaterialHandler` L34](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/classroom/handler/material_handler.go#L34) · [`materialRecord` L40](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/classroom/handler/material_handler.go#L40) · [`NewMaterial` L55](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/classroom/handler/material_handler.go#L55) · [`authorize` L63](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/classroom/handler/material_handler.go#L63) · [`Upload` L91](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/classroom/handler/material_handler.go#L91) · [`List` L224](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/classroom/handler/material_handler.go#L224) · [`Download` L260](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/classroom/handler/material_handler.go#L260) · [`safeMaterialName` L306](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/classroom/handler/material_handler.go#L306) · [`acceptableMaterialContent` L325](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/classroom/handler/material_handler.go#L325) · [`Remove` L352](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/classroom/handler/material_handler.go#L352)

### [backend/internal/classroom/handler/material_schedule_test.go](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/classroom/handler/material_schedule_test.go)

181 physical lines · **Test** · Test

[`TestScheduledMaterialUploadPrivacyAndPublication` L24](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/classroom/handler/material_schedule_test.go#L24)

### [backend/internal/classroom/handler/membership_handler.go](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/classroom/handler/membership_handler.go)

299 physical lines · **Source/config** · HTTP request/response adapter: membership_handler

[`MembershipHandler` L12](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/classroom/handler/membership_handler.go#L12) · [`NewMembership` L16](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/classroom/handler/membership_handler.go#L16) · [`Join` L24](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/classroom/handler/membership_handler.go#L24) · [`ListJoined` L63](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/classroom/handler/membership_handler.go#L63) · [`GetJoined` L105](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/classroom/handler/membership_handler.go#L105) · [`ListMembers` L133](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/classroom/handler/membership_handler.go#L133) · [`RemoveMember` L178](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/classroom/handler/membership_handler.go#L178) · [`handleMembershipError` L207](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/classroom/handler/membership_handler.go#L207)

### [backend/internal/classroom/handler/stream_handler.go](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/classroom/handler/stream_handler.go)

273 physical lines · **Source/config** · HTTP request/response adapter: stream_handler

[`StreamHandler` L11](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/classroom/handler/stream_handler.go#L11) · [`NewStream` L15](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/classroom/handler/stream_handler.go#L15) · [`CreateAnnouncement` L23](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/classroom/handler/stream_handler.go#L23) · [`List` L68](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/classroom/handler/stream_handler.go#L68) · [`UpdateAnnouncement` L115](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/classroom/handler/stream_handler.go#L115) · [`Pin` L159](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/classroom/handler/stream_handler.go#L159) · [`Unpin` L191](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/classroom/handler/stream_handler.go#L191) · [`Delete` L223](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/classroom/handler/stream_handler.go#L223) · [`streamHTTPError` L256](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/classroom/handler/stream_handler.go#L256) · [`handleStreamError` L270](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/classroom/handler/stream_handler.go#L270)

## backend/internal/classroom/repository

### [backend/internal/classroom/repository/classroom_repository.go](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/classroom/repository/classroom_repository.go)

141 physical lines · **Source/config** · Database query adapter: classroom_repository

[`ClassroomRepository` L14](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/classroom/repository/classroom_repository.go#L14) · [`New` L19](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/classroom/repository/classroom_repository.go#L19) · [`Create` L29](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/classroom/repository/classroom_repository.go#L29) · [`CreateWithEnrollment` L39](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/classroom/repository/classroom_repository.go#L39) · [`GetByID` L63](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/classroom/repository/classroom_repository.go#L63) · [`GetByCode` L73](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/classroom/repository/classroom_repository.go#L73) · [`ListByOwner` L83](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/classroom/repository/classroom_repository.go#L83) · [`Update` L103](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/classroom/repository/classroom_repository.go#L103) · [`Archive` L113](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/classroom/repository/classroom_repository.go#L113) · [`Unarchive` L123](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/classroom/repository/classroom_repository.go#L123) · [`Delete` L133](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/classroom/repository/classroom_repository.go#L133)

### [backend/internal/classroom/repository/membership_repository.go](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/classroom/repository/membership_repository.go)

99 physical lines · **Source/config** · Database query adapter: membership_repository

[`MembershipRepository` L9](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/classroom/repository/membership_repository.go#L9) · [`NewMembershipRepository` L13](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/classroom/repository/membership_repository.go#L13) · [`Create` L21](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/classroom/repository/membership_repository.go#L21) · [`Get` L31](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/classroom/repository/membership_repository.go#L31) · [`GetActive` L41](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/classroom/repository/membership_repository.go#L41) · [`Restore` L51](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/classroom/repository/membership_repository.go#L51) · [`ListJoined` L61](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/classroom/repository/membership_repository.go#L61) · [`ListMembers` L71](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/classroom/repository/membership_repository.go#L71) · [`Remove` L81](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/classroom/repository/membership_repository.go#L81) · [`Delete` L91](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/classroom/repository/membership_repository.go#L91)

### [backend/internal/classroom/repository/stream_repository.go](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/classroom/repository/stream_repository.go)

79 physical lines · **Source/config** · Database query adapter: stream_repository

[`StreamRepository` L9](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/classroom/repository/stream_repository.go#L9) · [`NewStreamRepository` L13](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/classroom/repository/stream_repository.go#L13) · [`CreateAnnouncement` L21](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/classroom/repository/stream_repository.go#L21) · [`List` L31](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/classroom/repository/stream_repository.go#L31) · [`UpdateAnnouncement` L41](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/classroom/repository/stream_repository.go#L41) · [`Pin` L51](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/classroom/repository/stream_repository.go#L51) · [`Unpin` L61](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/classroom/repository/stream_repository.go#L61) · [`Delete` L71](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/classroom/repository/stream_repository.go#L71)

## backend/internal/classroom/routes

### [backend/internal/classroom/routes/routes.go](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/classroom/routes/routes.go)

158 physical lines · **Source/config** · routes

[`Register` L10](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/classroom/routes/routes.go#L10)

## backend/internal/classroom/service

### [backend/internal/classroom/service/classroom_service.go](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/classroom/service/classroom_service.go)

684 physical lines · **Source/config** · Business logic: classroom_service

[`ClassroomService` L45](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/classroom/service/classroom_service.go#L45) · [`normalizedClassroomInput` L50](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/classroom/service/classroom_service.go#L50) · [`New` L58](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/classroom/service/classroom_service.go#L58) · [`Create` L68](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/classroom/service/classroom_service.go#L68) · [`ListMine` L153](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/classroom/service/classroom_service.go#L153) · [`GetMine` L185](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/classroom/service/classroom_service.go#L185) · [`Update` L205](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/classroom/service/classroom_service.go#L205) · [`Archive` L268](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/classroom/service/classroom_service.go#L268) · [`Unarchive` L300](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/classroom/service/classroom_service.go#L300) · [`Delete` L332](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/classroom/service/classroom_service.go#L332) · [`getManageableClassroom` L363](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/classroom/service/classroom_service.go#L363) · [`normalizeInput` L442](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/classroom/service/classroom_service.go#L442) · [`validationError` L509](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/classroom/service/classroom_service.go#L509) · [`parseUUID` L519](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/classroom/service/classroom_service.go#L519) · [`textValue` L536](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/classroom/service/classroom_service.go#L536) · [`generateClassCode` L545](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/classroom/service/classroom_service.go#L545) · [`isUniqueViolation` L563](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/classroom/service/classroom_service.go#L563) · [`normalizePagination` L574](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/classroom/service/classroom_service.go#L574) · [`mapClassrooms` L598](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/classroom/service/classroom_service.go#L598) · [`mapClassroom` L617](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/classroom/service/classroom_service.go#L617) · [`textPointer` L674](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/classroom/service/classroom_service.go#L674)

### [backend/internal/classroom/service/membership_service.go](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/classroom/service/membership_service.go)

466 physical lines · **Source/config** · Business logic: membership_service

[`MembershipService` L39](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/classroom/service/membership_service.go#L39) · [`NewMembership` L45](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/classroom/service/membership_service.go#L45) · [`Join` L57](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/classroom/service/membership_service.go#L57) · [`ListJoined` L171](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/classroom/service/membership_service.go#L171) · [`GetJoined` L212](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/classroom/service/membership_service.go#L212) · [`ListMembers` L269](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/classroom/service/membership_service.go#L269) · [`RemoveMember` L319](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/classroom/service/membership_service.go#L319) · [`mapJoinResponse` L390](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/classroom/service/membership_service.go#L390) · [`mapMembers` L411](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/classroom/service/membership_service.go#L411) · [`mapMember` L430](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/classroom/service/membership_service.go#L430)

### [backend/internal/classroom/service/stream_service.go](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/classroom/service/stream_service.go)

646 physical lines · **Source/config** · Business logic: stream_service

[`StreamService` L25](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/classroom/service/stream_service.go#L25) · [`normalizedAnnouncementInput` L32](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/classroom/service/stream_service.go#L32) · [`NewStream` L37](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/classroom/service/stream_service.go#L37) · [`CreateAnnouncement` L51](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/classroom/service/stream_service.go#L51) · [`List` L106](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/classroom/service/stream_service.go#L106) · [`UpdateAnnouncement` L156](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/classroom/service/stream_service.go#L156) · [`Pin` L222](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/classroom/service/stream_service.go#L222) · [`Unpin` L268](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/classroom/service/stream_service.go#L268) · [`Delete` L314](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/classroom/service/stream_service.go#L314) · [`requireStreamAccess` L359](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/classroom/service/stream_service.go#L359) · [`normalizeAnnouncement` L406](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/classroom/service/stream_service.go#L406) · [`parseStreamPostUUID` L433](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/classroom/service/stream_service.go#L433) · [`mapStreamPosts` L447](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/classroom/service/stream_service.go#L447) · [`mapStreamPost` L466](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/classroom/service/stream_service.go#L466) · [`mapStreamPostRow` L525](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/classroom/service/stream_service.go#L525) · [`mapStreamAuthor` L580](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/classroom/service/stream_service.go#L580) · [`streamUUIDPointer` L621](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/classroom/service/stream_service.go#L621) · [`AuthorizeMaterialAccess` L637](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/classroom/service/stream_service.go#L637) · [`mustAudienceViewer` L646](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/classroom/service/stream_service.go#L646)

## backend/internal/exam

### [backend/internal/exam/accommodations_test.go](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/exam/accommodations_test.go)

85 physical lines · **Test** · Test

[`TestPersonalExtraTimeReachesMobileAttemptAndKeepsHardClose` L14](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/exam/accommodations_test.go#L14) · [`TestManualExamPublicationCompletesPendingSchedule` L60](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/exam/accommodations_test.go#L60)

### [backend/internal/exam/answer_review.go](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/exam/answer_review.go)

32 physical lines · **Source/config** · Scheduled answer/key/explanation review

[`ReviewSettings` L7](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/exam/answer_review.go#L7)

### [backend/internal/exam/answer_review_test.go](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/exam/answer_review_test.go)

78 physical lines · **Test** · Test

[`TestAnswerReviewReleaseBoundary` L15](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/exam/answer_review_test.go#L15)

### [backend/internal/exam/authoring_workflows_test.go](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/exam/authoring_workflows_test.go)

259 physical lines · **Test** · Test

[`TestBankCatalogueReadinessAndApprovedSets` L19](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/exam/authoring_workflows_test.go#L19) · [`TestReadinessAndShufflingPreserveRequiredAnswerSemantics` L185](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/exam/authoring_workflows_test.go#L185) · [`TestApproveCodingSetsWithSingleConnection` L205](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/exam/authoring_workflows_test.go#L205)

### [backend/internal/exam/bank_catalogue.go](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/exam/bank_catalogue.go)

144 physical lines · **Source/config** · Question bank taxonomy/catalogue

[`BankCatalogue` L12](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/exam/bank_catalogue.go#L12) · [`BankTaxonomy` L49](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/exam/bank_catalogue.go#L49) · [`BankUsage` L73](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/exam/bank_catalogue.go#L73) · [`hydrateBankSources` L113](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/exam/bank_catalogue.go#L113)

### [backend/internal/exam/concurrency_integration_test.go](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/exam/concurrency_integration_test.go)

91 physical lines · **Test** · Test

[`TestConcurrentExamEntryAutosaveSubmitAndReplay` L20](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/exam/concurrency_integration_test.go#L20)

### [backend/internal/exam/exam_sets.go](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/exam/exam_sets.go)

410 physical lines · **Source/config** · Exam-set preview ও reviewed snapshot approval

[`ExamSet` L24](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/exam/exam_sets.go#L24) · [`setReceipt` L29](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/exam/exam_sets.go#L29) · [`objectDigest` L39](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/exam/exam_sets.go#L39) · [`setSecret` L44](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/exam/exam_sets.go#L44) · [`signSets` L51](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/exam/exam_sets.go#L51) · [`readSetReceipt` L65](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/exam/exam_sets.go#L65) · [`permutation` L90](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/exam/exam_sets.go#L90) · [`shuffledQuestion` L105](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/exam/exam_sets.go#L105) · [`shuffleSections` L146](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/exam/exam_sets.go#L146) · [`baseSetDigest` L164](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/exam/exam_sets.go#L164) · [`questionText` L170](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/exam/exam_sets.go#L170) · [`PreviewExamSets` L173](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/exam/exam_sets.go#L173) · [`sortedKeys` L286](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/exam/exam_sets.go#L286) · [`ApproveExamSets` L295](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/exam/exam_sets.go#L295)

### [backend/internal/exam/handler.go](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/exam/handler.go)

717 physical lines · **Source/config** · exam module: handler

[`Handler` L19](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/exam/handler.go#L19) · [`New` L21](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/exam/handler.go#L21) · [`Register` L23](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/exam/handler.go#L23) · [`failure` L49](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/exam/handler.go#L49) · [`result` L52](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/exam/handler.go#L52) · [`identity` L55](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/exam/handler.go#L55) · [`member` L65](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/exam/handler.go#L65) · [`examID` L108](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/exam/handler.go#L108) · [`Question` L116](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/exam/handler.go#L116) · [`PublicQuestion` L141](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/exam/handler.go#L141) · [`publicQuestions` L158](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/exam/handler.go#L158) · [`CreateRequest` L166](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/exam/handler.go#L166) · [`normalizeQuestions` L177](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/exam/handler.go#L177) · [`Exam` L266](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/exam/handler.go#L266) · [`List` L281](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/exam/handler.go#L281) · [`Create` L311](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/exam/handler.go#L311) · [`examWithKeys` L356](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/exam/handler.go#L356) · [`Get` L379](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/exam/handler.go#L379) · [`Publish` L398](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/exam/handler.go#L398) · [`Attempt` L429](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/exam/handler.go#L429) · [`scanAttempt` L441](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/exam/handler.go#L441) · [`attemptData` L456](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/exam/handler.go#L456) · [`Start` L502](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/exam/handler.go#L502) · [`Attempt` L527](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/exam/handler.go#L527) · [`AnswerRequest` L529](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/exam/handler.go#L529) · [`validateAnswers` L534](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/exam/handler.go#L534) · [`writeAnswers` L567](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/exam/handler.go#L567) · [`Save` L669](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/exam/handler.go#L669) · [`Submit` L670](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/exam/handler.go#L670) · [`Submissions` L671](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/exam/handler.go#L671)

### [backend/internal/exam/marksheet_styled.go](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/exam/marksheet_styled.go)

178 physical lines · **Source/config** · exam module: marksheet_styled

[`markSheetRow` L11](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/exam/marksheet_styled.go#L11) · [`pdfASCII` L17](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/exam/marksheet_styled.go#L17) · [`pdfEscape` L28](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/exam/marksheet_styled.go#L28) · [`pdfText` L35](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/exam/marksheet_styled.go#L35) · [`pdfFill` L38](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/exam/marksheet_styled.go#L38) · [`pdfLine` L41](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/exam/marksheet_styled.go#L41) · [`truncateASCII` L44](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/exam/marksheet_styled.go#L44) · [`buildStyledMarksPDF` L57](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/exam/marksheet_styled.go#L57)

### [backend/internal/exam/mcq.go](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/exam/mcq.go)

87 physical lines · **Source/config** · Single/multiple/dropdown answer normalization

[`normalizeMCQ` L10](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/exam/mcq.go#L10) · [`mcqIndices` L41](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/exam/mcq.go#L41) · [`mcqKey` L64](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/exam/mcq.go#L64) · [`mcqAnswerText` L77](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/exam/mcq.go#L77)

### [backend/internal/exam/mcq_test.go](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/exam/mcq_test.go)

136 physical lines · **Test** · Test

[`TestCheckboxKeysAndCanonicalAnswers` L15](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/exam/mcq_test.go#L15) · [`TestMCQDatabaseScoreAndAutoMarks` L54](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/exam/mcq_test.go#L54) · [`TestCheckboxPhoneSubmissionAndAutoMarks` L76](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/exam/mcq_test.go#L76)

### [backend/internal/exam/mobile_access.go](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/exam/mobile_access.go)

118 physical lines · **Source/config** · Teacher-enabled MCQ phone entry policy

[`isPhoneAgent` L12](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/exam/mobile_access.go#L12) · [`mcqOnly` L21](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/exam/mobile_access.go#L21) · [`ExamAccess` L32](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/exam/mobile_access.go#L32) · [`startMobile` L50](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/exam/mobile_access.go#L50) · [`phoneAttemptAllowed` L113](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/exam/mobile_access.go#L113)

### [backend/internal/exam/mobile_integration_test.go](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/exam/mobile_integration_test.go)

99 physical lines · **Test** · Test

[`TestMobileExamPolicyAndRecovery` L15](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/exam/mobile_integration_test.go#L15)

### [backend/internal/exam/native_policy_test.go](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/exam/native_policy_test.go)

27 physical lines · **Test** · Test

[`TestNativeTesterRequiresExplicitProductionTrust` L9](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/exam/native_policy_test.go#L9)

### [backend/internal/exam/phase11.go](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/exam/phase11.go)

427 physical lines · **Source/config** · Browser-monitor policy/evidence routes

[`RegisterPhase11` L15](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/exam/phase11.go#L15) · [`monitorExam` L26](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/exam/phase11.go#L26) · [`MonitorPolicy` L46](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/exam/phase11.go#L46) · [`SetMonitorPolicy` L54](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/exam/phase11.go#L54) · [`studentMonitorAttempt` L100](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/exam/phase11.go#L100) · [`MonitorHeartbeat` L126](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/exam/phase11.go#L126) · [`monitorEvent` L172](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/exam/phase11.go#L172) · [`RecordMonitorEvents` L190](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/exam/phase11.go#L190) · [`teacherMonitorAttempt` L269](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/exam/phase11.go#L269) · [`MonitorReport` L289](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/exam/phase11.go#L289) · [`maxInt` L377](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/exam/phase11.go#L377) · [`LiveMonitor` L384](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/exam/phase11.go#L384)

### [backend/internal/exam/phase12_admission.go](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/exam/phase12_admission.go)

83 physical lines · **Source/config** · Exam admission ও monitor evidence authorization

[`MonitorAdmission` L14](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/exam/phase12_admission.go#L14) · [`requireMonitorAdmission` L58](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/exam/phase12_admission.go#L58)

### [backend/internal/exam/phase14_desktop.go](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/exam/phase14_desktop.go)

366 physical lines · **Source/config** · Attempt-scoped native desktop pairing/telemetry

[`RegisterPhase14` L20](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/exam/phase14_desktop.go#L20) · [`RegisterPhase14Client` L30](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/exam/phase14_desktop.go#L30) · [`desktopSecret` L38](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/exam/phase14_desktop.go#L38) · [`digestSecret` L48](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/exam/phase14_desktop.go#L48) · [`CreateDesktopPair` L53](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/exam/phase14_desktop.go#L53) · [`DesktopStatus` L76](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/exam/phase14_desktop.go#L76) · [`desktopConnectRequest` L97](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/exam/phase14_desktop.go#L97) · [`DesktopConnect` L102](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/exam/phase14_desktop.go#L102) · [`desktopBearer` L181](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/exam/phase14_desktop.go#L181) · [`desktopAttempt` L192](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/exam/phase14_desktop.go#L192) · [`DesktopHeartbeat` L211](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/exam/phase14_desktop.go#L211) · [`desktopEvent` L234](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/exam/phase14_desktop.go#L234) · [`DesktopEvents` L241](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/exam/phase14_desktop.go#L241) · [`DesktopStop` L305](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/exam/phase14_desktop.go#L305) · [`DesktopReport` L327](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/exam/phase14_desktop.go#L327)

### [backend/internal/exam/phase14b_preflight.go](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/exam/phase14b_preflight.go)

172 physical lines · **Source/config** · Desktop preflight before an attempt starts

[`preflightMember` L14](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/exam/phase14b_preflight.go#L14) · [`DesktopPreflightPair` L42](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/exam/phase14b_preflight.go#L42) · [`DesktopPreflightStatus` L75](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/exam/phase14b_preflight.go#L75) · [`requireDesktopPreflight` L105](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/exam/phase14b_preflight.go#L105) · [`promoteDesktopPreflight` L129](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/exam/phase14b_preflight.go#L129) · [`desktopPreflightToken` L158](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/exam/phase14b_preflight.go#L158)

### [backend/internal/exam/phase3.go](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/exam/phase3.go)

301 physical lines · **Source/config** · Coding execution ও student activity endpoints

[`RegisterPhase3` L19](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/exam/phase3.go#L19) · [`activityEvent` L26](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/exam/phase3.go#L26) · [`activityPayload` L31](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/exam/phase3.go#L31) · [`checkEvent` L35](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/exam/phase3.go#L35) · [`activeAttempt` L61](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/exam/phase3.go#L61) · [`LogActivity` L90](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/exam/phase3.go#L90) · [`runPayload` L135](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/exam/phase3.go#L135) · [`RunCode` L143](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/exam/phase3.go#L143) · [`heuristicFlags` L221](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/exam/phase3.go#L221) · [`ActivityReport` L234](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/exam/phase3.go#L234) · [`runnerEnabled` L299](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/exam/phase3.go#L299)

### [backend/internal/exam/phase4.go](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/exam/phase4.go)

775 physical lines · **Source/config** · Exam management, grades, results ও marksheet PDF

[`RegisterPhase4` L20](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/exam/phase4.go#L20) · [`checkedTeacherExam` L35](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/exam/phase4.go#L35) · [`EditExam` L44](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/exam/phase4.go#L44) · [`CloseExam` L114](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/exam/phase4.go#L114) · [`markRow` L148](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/exam/phase4.go#L148) · [`syncAutoMarks` L155](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/exam/phase4.go#L155) · [`Grades` L177](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/exam/phase4.go#L177) · [`gradeInput` L269](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/exam/phase4.go#L269) · [`SetGrade` L276](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/exam/phase4.go#L276) · [`publicationInput` L343](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/exam/phase4.go#L343) · [`updateMarksheet` L347](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/exam/phase4.go#L347) · [`jsonUnmarshalQuestions` L417](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/exam/phase4.go#L417) · [`publishOrRetract` L419](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/exam/phase4.go#L419) · [`PublishExamResults` L547](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/exam/phase4.go#L547) · [`RetractExamResults` L548](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/exam/phase4.go#L548) · [`PublicResults` L550](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/exam/phase4.go#L550) · [`MyResult` L591](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/exam/phase4.go#L591) · [`MarksheetPDF` L664](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/exam/phase4.go#L664) · [`buildSimplePDF` L689](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/exam/phase4.go#L689) · [`RegenerateMarksheet` L750](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/exam/phase4.go#L750)

### [backend/internal/exam/question_bank.go](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/exam/question_bank.go)

176 physical lines · **Source/config** · Reusable classroom question bank

[`BankItem` L12](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/exam/question_bank.go#L12) · [`registerQuestionBank` L21](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/exam/question_bank.go#L21) · [`BankList` L33](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/exam/question_bank.go#L33) · [`BankDraw` L34](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/exam/question_bank.go#L34) · [`bankRead` L35](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/exam/question_bank.go#L35) · [`BankSave` L72](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/exam/question_bank.go#L72) · [`BankDelete` L161](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/exam/question_bank.go#L161)

### [backend/internal/exam/question_duplicates.go](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/exam/question_duplicates.go)

43 physical lines · **Source/config** · Potential duplicate detection

[`BankDuplicates` L10](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/exam/question_duplicates.go#L10)

### [backend/internal/exam/question_duplicates_test.go](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/exam/question_duplicates_test.go)

46 physical lines · **Test** · Test

[`TestBankDuplicatePreviewChecksMembershipAndNeverWrites` L13](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/exam/question_duplicates_test.go#L13)

### [backend/internal/exam/question_media.go](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/exam/question_media.go)

87 physical lines · **Source/config** · Question/option image validation

[`QuestionImage` L16](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/exam/question_media.go#L16) · [`validateQuestionImage` L23](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/exam/question_media.go#L23) · [`validateQuestionMedia` L56](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/exam/question_media.go#L56) · [`questionImagePixels` L76](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/exam/question_media.go#L76)

### [backend/internal/exam/question_media_test.go](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/exam/question_media_test.go)

42 physical lines · **Test** · Test

[`TestQuestionImagesAreBoundedAndPrivate` L14](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/exam/question_media_test.go#L14)

### [backend/internal/exam/question_testers.go](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/exam/question_testers.go)

222 physical lines · **Source/config** · Optional teacher-provided Windows tester attachments/tickets

[`TesterAttachment` L23](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/exam/question_testers.go#L23) · [`registerQuestionTesters` L30](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/exam/question_testers.go#L30) · [`nativeTesterPolicy` L37](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/exam/question_testers.go#L37) · [`validWindowsTester` L44](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/exam/question_testers.go#L44) · [`UploadTester` L53](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/exam/question_testers.go#L53) · [`hydrateTesters` L106](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/exam/question_testers.go#L106) · [`testerReader` L110](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/exam/question_testers.go#L110) · [`hydrateTesters` L115](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/exam/question_testers.go#L115) · [`TesterTicket` L143](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/exam/question_testers.go#L143) · [`DownloadTesterBundle` L193](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/exam/question_testers.go#L193)

### [backend/internal/exam/question_testers_test.go](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/exam/question_testers_test.go)

56 physical lines · **Test** · Test

[`TestWindowsTesterValidation` L9](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/exam/question_testers_test.go#L9) · [`TestPublicQuestionKeepsOptionalTesterWithoutAnswerKeys` L31](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/exam/question_testers_test.go#L31)

### [backend/internal/exam/readiness.go](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/exam/readiness.go)

154 physical lines · **Source/config** · Exam publish-readiness validation

[`ReadinessIssue` L12](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/exam/readiness.go#L12) · [`ReadinessReport` L19](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/exam/readiness.go#L19) · [`inspectExam` L25](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/exam/readiness.go#L25) · [`ExamReadiness` L83](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/exam/readiness.go#L83) · [`validatePublishingExam` L117](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/exam/readiness.go#L117)

### [backend/internal/exam/recovery.go](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/exam/recovery.go)

39 physical lines · **Source/config** · Attempt revision, resume ও concurrent-save controls

[`ActiveAttempts` L5](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/exam/recovery.go#L5)

### [backend/internal/exam/recovery_integration_test.go](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/exam/recovery_integration_test.go)

120 physical lines · **Test** · Test

[`TestRecoveryRevisionAndSubmissionReceipt` L15](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/exam/recovery_integration_test.go#L15) · [`TestQuestionBankSnapshotAndClassIsolation` L69](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/exam/recovery_integration_test.go#L69)

### [backend/internal/exam/redteam_test.go](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/exam/redteam_test.go)

118 physical lines · **Test** · Test

[`TestRedTeamTesterCapabilityRevocation` L18](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/exam/redteam_test.go#L18) · [`FuzzRedTeamTesterBytes` L105](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/exam/redteam_test.go#L105)

### [backend/internal/exam/runner_phase3.go](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/exam/runner_phase3.go)

127 physical lines · **Source/config** · Restricted per-run Docker code execution

[`runOutput` L20](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/exam/runner_phase3.go#L20) · [`boundedBuffer` L28](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/exam/runner_phase3.go#L28) · [`Write` L34](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/exam/runner_phase3.go#L34) · [`compilerSpec` L53](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/exam/runner_phase3.go#L53) · [`runSandbox` L71](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/exam/runner_phase3.go#L71)

### [backend/internal/exam/workspace_phase6.go](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/exam/workspace_phase6.go)

379 physical lines · **Source/config** · Multi-file coding workspace execution

[`workspaceFile` L25](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/exam/workspace_phase6.go#L25) · [`workspaceRunRequest` L29](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/exam/workspace_phase6.go#L29) · [`cleanWorkPath` L44](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/exam/workspace_phase6.go#L44) · [`workspaceLanguage` L60](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/exam/workspace_phase6.go#L60) · [`workspaceSpec` L86](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/exam/workspace_phase6.go#L86) · [`runWorkspaceSandbox` L206](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/exam/workspace_phase6.go#L206) · [`RunWorkspace` L268](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/exam/workspace_phase6.go#L268)

## backend/internal/learning

### [backend/internal/learning/academic_tools_test.go](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/learning/academic_tools_test.go)

196 physical lines · **Test** · Test

[`academicApp` L22](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/learning/academic_tools_test.go#L22) · [`TestSearchScopesDraftsLiteralWildcardsAndNoExamKeys` L39](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/learning/academic_tools_test.go#L39) · [`TestCalendarReminderExactlyOnceAndRevokedAccess` L62](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/learning/academic_tools_test.go#L62) · [`TestBulkImportPreviewConflictReplayBundleAndProgress` L96](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/learning/academic_tools_test.go#L96) · [`TestGradeCSVValidation` L155](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/learning/academic_tools_test.go#L155) · [`TestImportTemplateIdentifiesStudentsAndIncludesRubricCriteria` L163](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/learning/academic_tools_test.go#L163)

### [backend/internal/learning/accessible_materials.go](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/learning/accessible_materials.go)

131 physical lines · **Source/config** · Alt text, plain text, transcript ও WebVTT

[`MaterialAccessibility` L13](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/learning/accessible_materials.go#L13) · [`captionMillis` L24](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/learning/accessible_materials.go#L24) · [`validCaptions` L50](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/learning/accessible_materials.go#L50) · [`validAccessibility` L77](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/learning/accessible_materials.go#L77) · [`AccessibleMaterial` L85](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/learning/accessible_materials.go#L85)

### [backend/internal/learning/accommodations.go](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/learning/accommodations.go)

169 physical lines · **Source/config** · Optional individual exam/assignment timing

[`Accommodations` L15](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/learning/accommodations.go#L15)

### [backend/internal/learning/activity.go](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/learning/activity.go)

82 physical lines · **Source/config** · Teacher action history ও audit context

[`Activity` L12](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/learning/activity.go#L12) · [`AssignmentDeadline` L47](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/learning/activity.go#L47)

### [backend/internal/learning/activity_test.go](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/learning/activity_test.go)

109 physical lines · **Test** · Test

[`TestTeacherActivityAtomicityIsolationAndDeadlineConflict` L14](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/learning/activity_test.go#L14) · [`TestMaterialDeletionAndExamGradesAreAudited` L68](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/learning/activity_test.go#L68)

### [backend/internal/learning/analytics.go](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/learning/analytics.go)

98 physical lines · **Source/config** · Classroom learning analytics

[`Analytics` L9](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/learning/analytics.go#L9)

### [backend/internal/learning/announcements.go](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/learning/announcements.go)

217 physical lines · **Source/config** · Announcement drafts, scheduling ও publish workflow

[`Announcements` L17](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/learning/announcements.go#L17) · [`PublishAnnouncement` L109](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/learning/announcements.go#L109) · [`publishScheduled` L149](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/learning/announcements.go#L149) · [`registerScheduledAnnouncements` L182](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/learning/announcements.go#L182)

### [backend/internal/learning/assignments.go](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/learning/assignments.go)

381 physical lines · **Source/config** · Assignment authoring, versioned submission ও grading

[`Assignment` L19](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/learning/assignments.go#L19) · [`validAssignment` L34](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/learning/assignments.go#L34) · [`ListAssignments` L46](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/learning/assignments.go#L46) · [`SaveAssignment` L69](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/learning/assignments.go#L69) · [`PublishAssignment` L132](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/learning/assignments.go#L132) · [`assignmentFileName` L164](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/learning/assignments.go#L164) · [`SubmitAssignment` L171](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/learning/assignments.go#L171) · [`AssignmentSubmissions` L265](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/learning/assignments.go#L265) · [`GradeAssignment` L299](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/learning/assignments.go#L299) · [`AssignmentFile` L356](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/learning/assignments.go#L356)

### [backend/internal/learning/assignments_test.go](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/learning/assignments_test.go)

29 physical lines · **Test** · Test

[`TestAssignmentLimits` L8](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/learning/assignments_test.go#L8) · [`TestSubmissionFiles` L18](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/learning/assignments_test.go#L18)

### [backend/internal/learning/audience.go](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/learning/audience.go)

49 physical lines · **Source/config** · Everyone/odd/even/range/custom targeting

[`AudiencePreview` L11](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/learning/audience.go#L11)

### [backend/internal/learning/audience_test.go](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/learning/audience_test.go)

42 physical lines · **Test** · Test

[`TestAudiencePreviewHundredRollGroups` L12](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/learning/audience_test.go#L12)

### [backend/internal/learning/bulk.go](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/learning/bulk.go)

336 physical lines · **Source/config** · Bulk marks import, reminder ও submission bundle

[`importGrade` L24](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/learning/bulk.go#L24) · [`parseGradeCSV` L34](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/learning/bulk.go#L34) · [`digestBytes` L90](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/learning/bulk.go#L90) · [`ImportGrades` L91](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/learning/bulk.go#L91) · [`SubmissionBundle` L203](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/learning/bulk.go#L203) · [`RemindStudents` L272](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/learning/bulk.go#L272)

### [backend/internal/learning/bulk_template.go](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/learning/bulk_template.go)

94 physical lines · **Source/config** · learning module: bulk_template

[`csvSafe` L15](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/learning/bulk_template.go#L15) · [`GradeImportTemplate` L22](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/learning/bulk_template.go#L22)

### [backend/internal/learning/calendar.go](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/learning/calendar.go)

203 physical lines · **Source/config** · Calendar events ও reminder scheduling

[`Calendar` L17](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/learning/calendar.go#L17) · [`SaveCalendarEvent` L60](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/learning/calendar.go#L60) · [`CalendarReminder` L112](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/learning/calendar.go#L112) · [`deliverCalendarReminder` L146](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/learning/calendar.go#L146) · [`registerCalendarReminders` L176](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/learning/calendar.go#L176)

### [backend/internal/learning/classroom_details.go](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/learning/classroom_details.go)

55 physical lines · **Source/config** · Class details ও leave-class flow

[`ClassroomDetails` L6](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/learning/classroom_details.go#L6) · [`LeaveClassroom` L39](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/learning/classroom_details.go#L39)

### [backend/internal/learning/classroom_details_test.go](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/learning/classroom_details_test.go)

67 physical lines · **Test** · Test

[`TestClassDetailsAndStudentLeave` L14](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/learning/classroom_details_test.go#L14)

### [backend/internal/learning/classroom_extensions_test.go](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/learning/classroom_extensions_test.go)

151 physical lines · **Test** · Test

[`TestScheduledAssignmentsConcurrentPublicationAndCancellation` L18](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/learning/classroom_extensions_test.go#L18) · [`TestProgressCourseworkPrivacyFeedbackAndClassScopedSearch` L76](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/learning/classroom_extensions_test.go#L76) · [`TestScheduledContentRechecksCoTeacherPermissions` L113](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/learning/classroom_extensions_test.go#L113)

### [backend/internal/learning/classwork.go](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/learning/classwork.go)

112 physical lines · **Source/config** · Combined coursework catalogue ও duplication

[`Classwork` L14](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/learning/classwork.go#L14) · [`DuplicateCoursework` L74](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/learning/classwork.go#L74)

### [backend/internal/learning/content_schedules.go](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/learning/content_schedules.go)

137 physical lines · **Source/config** · Optional release scheduling ও status

[`ContentSchedules` L13](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/learning/content_schedules.go#L13)

### [backend/internal/learning/features_integration_test.go](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/learning/features_integration_test.go)

175 physical lines · **Test** · Test

[`testApp` L17](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/learning/features_integration_test.go#L17) · [`call` L40](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/learning/features_integration_test.go#L40) · [`submitFile` L63](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/learning/features_integration_test.go#L63) · [`TestAssignmentLifecycleAndIsolation` L89](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/learning/features_integration_test.go#L89) · [`TestAnalyticsPublicationAndTutorExamGate` L131](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/learning/features_integration_test.go#L131) · [`TestTutorSourcesStayClassScoped` L167](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/learning/features_integration_test.go#L167)

### [backend/internal/learning/gradebook.go](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/learning/gradebook.go)

184 physical lines · **Source/config** · Assignment/exam grade aggregation

[`gradeColumn` L9](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/learning/gradebook.go#L9) · [`gradeCell` L17](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/learning/gradebook.go#L17) · [`gradeStudent` L24](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/learning/gradebook.go#L24) · [`Gradebook` L35](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/learning/gradebook.go#L35)

### [backend/internal/learning/gradebook_test.go](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/learning/gradebook_test.go)

47 physical lines · **Test** · Test

[`TestGradebookIsolationLatestVersionAndMissing` L11](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/learning/gradebook_test.go#L11)

### [backend/internal/learning/grading_tools.go](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/learning/grading_tools.go)

162 physical lines · **Source/config** · Rubrics ও feedback templates

[`RubricCriterion` L12](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/learning/grading_tools.go#L12) · [`validRubric` L19](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/learning/grading_tools.go#L19) · [`rubricTotal` L40](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/learning/grading_tools.go#L40) · [`GradingTemplates` L60](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/learning/grading_tools.go#L60)

### [backend/internal/learning/grading_tools_test.go](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/learning/grading_tools_test.go)

50 physical lines · **Test** · Test

[`TestRubricValidationTemplatesAndAuthoritativeScoring` L11](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/learning/grading_tools_test.go#L11)

### [backend/internal/learning/handler.go](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/learning/handler.go)

180 physical lines · **Source/config** · learning module: handler

[`Handler` L13](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/learning/handler.go#L13) · [`Register` L19](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/learning/handler.go#L19) · [`respond` L120](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/learning/handler.go#L120) · [`fail` L123](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/learning/handler.go#L123) · [`member` L124](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/learning/handler.go#L124) · [`validID` L175](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/learning/handler.go#L175)

### [backend/internal/learning/institution_classes.go](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/learning/institution_classes.go)

144 physical lines · **Source/config** · Institution class placement ও independence

[`InstitutionClasses` L11](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/learning/institution_classes.go#L11) · [`ClassInstitution` L60](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/learning/institution_classes.go#L60) · [`InstitutionDetach` L107](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/learning/institution_classes.go#L107)

### [backend/internal/learning/institution_invitations.go](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/learning/institution_invitations.go)

258 physical lines · **Source/config** · Institution invitations

[`InstitutionInvitations` L13](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/learning/institution_invitations.go#L13) · [`InstitutionInbox` L130](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/learning/institution_invitations.go#L130) · [`RespondInstitutionInvite` L170](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/learning/institution_invitations.go#L170)

### [backend/internal/learning/institution_members.go](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/learning/institution_members.go)

150 physical lines · **Source/config** · Institution membership ও roles

[`InstitutionMembers` L14](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/learning/institution_members.go#L14) · [`InstitutionActivity` L113](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/learning/institution_members.go#L113)

### [backend/internal/learning/institution_routes.go](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/learning/institution_routes.go)

30 physical lines · **Source/config** · learning module: institution_routes

[`registerInstitutions` L8](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/learning/institution_routes.go#L8)

### [backend/internal/learning/institutions.go](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/learning/institutions.go)

300 physical lines · **Source/config** · Optional institution workspace/settings

[`institutionActor` L14](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/learning/institutions.go#L14) · [`institutionPage` L22](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/learning/institutions.go#L22) · [`institutionRole` L29](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/learning/institutions.go#L29) · [`institutionUnique` L40](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/learning/institutions.go#L40) · [`Institutions` L47](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/learning/institutions.go#L47) · [`InstitutionWorkspace` L126](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/learning/institutions.go#L126) · [`InstitutionUnits` L195](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/learning/institutions.go#L195)

### [backend/internal/learning/institutions_test.go](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/learning/institutions_test.go)

102 physical lines · **Test** · Test

[`institutionApp` L15](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/learning/institutions_test.go#L15) · [`TestOptionalInstitutionsPreserveStandaloneClassesAndEnrollment` L37](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/learning/institutions_test.go#L37)

### [backend/internal/learning/large_class_test.go](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/learning/large_class_test.go)

74 physical lines · **Test** · Test

[`TestLargeClassProgressAndGradebook` L12](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/learning/large_class_test.go#L12)

### [backend/internal/learning/personal_files.go](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/learning/personal_files.go)

129 physical lines · **Source/config** · Private note attachments

[`PersonalFile` L14](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/learning/personal_files.go#L14)

### [backend/internal/learning/personal_workspace.go](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/learning/personal_workspace.go)

307 physical lines · **Source/config** · Private notes, checklists ও resource references

[`personalCheck` L14](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/learning/personal_workspace.go#L14) · [`personalLink` L19](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/learning/personal_workspace.go#L19) · [`personalItem` L23](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/learning/personal_workspace.go#L23) · [`personalIdentity` L38](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/learning/personal_workspace.go#L38) · [`validPersonal` L46](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/learning/personal_workspace.go#L46) · [`personalContext` L104](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/learning/personal_workspace.go#L104) · [`PersonalItems` L155](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/learning/personal_workspace.go#L155) · [`personalGet` L267](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/learning/personal_workspace.go#L267)

### [backend/internal/learning/personal_workspace_test.go](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/learning/personal_workspace_test.go)

161 physical lines · **Test** · Test

[`personalApp` L16](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/learning/personal_workspace_test.go#L16) · [`TestPersonalNotesArePrivateVersionedAndKeepOwnedContext` L28](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/learning/personal_workspace_test.go#L28) · [`uploadPersonal` L74](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/learning/personal_workspace_test.go#L74) · [`TestPersonalFilesEnforceOwnershipQuotaAndVersions` L98](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/learning/personal_workspace_test.go#L98) · [`TestPersonalMessageContextRequiresConversationParticipation` L132](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/learning/personal_workspace_test.go#L132)

### [backend/internal/learning/progress.go](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/learning/progress.go)

170 physical lines · **Source/config** · Student progress ও attendance summary

[`Progress` L11](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/learning/progress.go#L11) · [`buildProgress` L54](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/learning/progress.go#L54) · [`buildProgressPage` L57](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/learning/progress.go#L57) · [`Attendance` L103](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/learning/progress.go#L103)

### [backend/internal/learning/progress_coursework.go](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/learning/progress_coursework.go)

68 physical lines · **Source/config** · Student coursework feedback view

[`ProgressCoursework` L13](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/learning/progress_coursework.go#L13)

### [backend/internal/learning/question_analysis.go](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/learning/question_analysis.go)

170 physical lines · **Source/config** · Exam question-level analysis

[`QuestionAnalysis` L13](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/learning/question_analysis.go#L13) · [`snapshotHash` L170](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/learning/question_analysis.go#L170)

### [backend/internal/learning/rechecks.go](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/learning/rechecks.go)

223 physical lines · **Source/config** · Student recheck request ও teacher response

[`RecheckCandidates` L15](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/learning/rechecks.go#L15) · [`recheckGrade` L44](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/learning/rechecks.go#L44) · [`Rechecks` L76](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/learning/rechecks.go#L76) · [`recordRecheckEvent` L168](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/learning/rechecks.go#L168) · [`RespondRecheck` L172](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/learning/rechecks.go#L172)

### [backend/internal/learning/redteam_test.go](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/learning/redteam_test.go)

76 physical lines · **Test** · Test

[`TestRedTeamConcurrentTutorQuotaAndReplay` L17](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/learning/redteam_test.go#L17)

### [backend/internal/learning/reports.go](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/learning/reports.go)

183 physical lines · **Source/config** · Academic report snapshots ও lifecycle

[`AcademicReports` L14](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/learning/reports.go#L14) · [`AcademicReport` L125](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/learning/reports.go#L125)

### [backend/internal/learning/roster_import.go](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/learning/roster_import.go)

171 physical lines · **Source/config** · Roll/section roster reconciliation

[`rosterImportRow` L18](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/learning/roster_import.go#L18) · [`ImportRoster` L30](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/learning/roster_import.go#L30)

### [backend/internal/learning/schedule_conflicts.go](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/learning/schedule_conflicts.go)

98 physical lines · **Source/config** · Optional schedule conflict checks

[`ScheduleConflicts` L12](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/learning/schedule_conflicts.go#L12)

### [backend/internal/learning/schedule_conflicts_test.go](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/learning/schedule_conflicts_test.go)

83 physical lines · **Test** · Test

[`TestScheduleChecksAreAdvisoryScopedAndAudienceAware` L12](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/learning/schedule_conflicts_test.go#L12) · [`TestScheduleChecksBoundLargeCandidateLists` L69](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/learning/schedule_conflicts_test.go#L69)

### [backend/internal/learning/search.go](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/learning/search.go)

67 physical lines · **Source/config** · learning module: search

[`Search` L11](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/learning/search.go#L11)

### [backend/internal/learning/section_bulk.go](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/learning/section_bulk.go)

51 physical lines · **Source/config** · Confirmed bulk section transfer

[`BulkSection` L10](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/learning/section_bulk.go#L10)

### [backend/internal/learning/sections.go](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/learning/sections.go)

282 physical lines · **Source/config** · Optional classroom sections

[`lockRoster` L17](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/learning/sections.go#L17) · [`Sections` L25](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/learning/sections.go#L25) · [`rosterStudent` L119](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/learning/sections.go#L119) · [`SectionRoster` L128](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/learning/sections.go#L128) · [`updateRoster` L189](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/learning/sections.go#L189) · [`selectionFilter` L257](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/learning/sections.go#L257) · [`registerSections` L271](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/learning/sections.go#L271)

### [backend/internal/learning/sections_test.go](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/learning/sections_test.go)

87 physical lines · **Test** · Test

[`TestOptionalSectionsTransferFiltersAndRosterImport` L14](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/learning/sections_test.go#L14)

### [backend/internal/learning/semester_reviews_test.go](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/learning/semester_reviews_test.go)

286 physical lines · **Test** · Test

[`reviewApp` L17](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/learning/semester_reviews_test.go#L17) · [`TestSemesterRolloverKeepsPrivateRecordsOutAndCopiesFiles` L38](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/learning/semester_reviews_test.go#L38) · [`TestQuestionAnalysisCountsCompletedAnswersAndProtectsKeys` L143](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/learning/semester_reviews_test.go#L143) · [`TestSimilarityUsesVersionSnapshotsAndNeverChangesGrades` L180](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/learning/semester_reviews_test.go#L180) · [`TestRecheckPrivateHistoryConflictAndGradeSnapshot` L211](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/learning/semester_reviews_test.go#L211) · [`TestAccessibleMaterialsConflictSearchAndClassPrivacy` L238](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/learning/semester_reviews_test.go#L238) · [`TestSimilarityAndCaptionBoundaries` L269](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/learning/semester_reviews_test.go#L269)

### [backend/internal/learning/semesters.go](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/learning/semesters.go)

498 physical lines · **Source/config** · Terms, archive catalogue ও class rollover

[`Terms` L20](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/learning/semesters.go#L20) · [`SemesterClasses` L68](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/learning/semesters.go#L68) · [`SaveSemesterClass` L95](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/learning/semesters.go#L95) · [`ArchiveContents` L148](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/learning/semesters.go#L148) · [`RolloverClass` L185](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/learning/semesters.go#L185) · [`copySemesterExams` L364](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/learning/semesters.go#L364) · [`copySemesterMaterials` L427](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/learning/semesters.go#L427)

### [backend/internal/learning/similarity.go](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/learning/similarity.go)

197 physical lines · **Source/config** · Submission similarity review; plagiarism proof নয়

[`textShingles` L11](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/learning/similarity.go#L11) · [`textSimilarity` L22](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/learning/similarity.go#L22) · [`SimilarityRoster` L38](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/learning/similarity.go#L38) · [`Similarity` L67](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/learning/similarity.go#L67) · [`ReviewSimilarity` L173](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/learning/similarity.go#L173)

### [backend/internal/learning/staff_permissions.go](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/learning/staff_permissions.go)

223 physical lines · **Source/config** · Co-teacher permission enforcement

[`StaffPolicy` L15](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/learning/staff_permissions.go#L15) · [`staffScope` L54](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/learning/staff_permissions.go#L54) · [`StaffPermissions` L116](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/learning/staff_permissions.go#L116)

### [backend/internal/learning/storage.go](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/learning/storage.go)

130 physical lines · **Source/config** · Storage usage, quota ও file listing

[`Storage` L8](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/learning/storage.go#L8) · [`StorageFiles` L36](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/learning/storage.go#L36) · [`MaterialUsage` L115](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/learning/storage.go#L115)

### [backend/internal/learning/student_view.go](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/learning/student_view.go)

62 physical lines · **Source/config** · Teacher student-audience preview

[`StudentView` L12](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/learning/student_view.go#L12)

### [backend/internal/learning/task_inbox.go](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/learning/task_inbox.go)

83 physical lines · **Source/config** · Cross-class actionable task inbox

[`TaskInbox` L12](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/learning/task_inbox.go#L12)

### [backend/internal/learning/topics.go](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/learning/topics.go)

174 physical lines · **Source/config** · Classwork topics ও organization

[`Topics` L11](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/learning/topics.go#L11) · [`SaveTopic` L52](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/learning/topics.go#L52) · [`MoveTopicResource` L119](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/learning/topics.go#L119)

### [backend/internal/learning/topics_test.go](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/learning/topics_test.go)

76 physical lines · **Test** · Test

[`TestClassworkTopicIsolation` L14](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/learning/topics_test.go#L14)

### [backend/internal/learning/trash.go](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/learning/trash.go)

175 physical lines · **Source/config** · Soft-deleted classroom/content restore

[`trashPage` L12](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/learning/trash.go#L12) · [`restoreRequest` L19](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/learning/trash.go#L19) · [`TrashClasses` L30](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/learning/trash.go#L30) · [`recordRestore` L93](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/learning/trash.go#L93) · [`TrashContent` L97](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/learning/trash.go#L97)

### [backend/internal/learning/tutor.go](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/learning/tutor.go)

485 physical lines · **Source/config** · Class-source OpenAI tutor, quota ও private history

[`TutorSource` L23](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/learning/tutor.go#L23) · [`TutorTurn` L32](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/learning/tutor.go#L32) · [`TutorCitation` L36](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/learning/tutor.go#L36) · [`registerTutor` L43](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/learning/tutor.go#L43) · [`tutorConfigured` L51](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/learning/tutor.go#L51) · [`tutorBlocked` L54](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/learning/tutor.go#L54) · [`TutorSources` L62](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/learning/tutor.go#L62) · [`TutorAddSource` L84](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/learning/tutor.go#L84) · [`materialPath` L165](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/learning/tutor.go#L165) · [`TutorDeleteSource` L172](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/learning/tutor.go#L172) · [`TutorHistory` L185](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/learning/tutor.go#L185) · [`sourceExcerpt` L216](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/learning/tutor.go#L216) · [`TutorAsk` L242](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/learning/tutor.go#L242) · [`generateTutorAnswer` L381](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/learning/tutor.go#L381)

### [backend/internal/learning/tutor_integration_test.go](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/learning/tutor_integration_test.go)

44 physical lines · **Test** · Test

[`TestTutorAPIIdempotenceAndPrivateHistory` L13](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/learning/tutor_integration_test.go#L13)

### [backend/internal/learning/tutor_test.go](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/learning/tutor_test.go)

50 physical lines · **Test** · Test

[`TestTutorProviderRequestAndCitations` L12](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/learning/tutor_test.go#L12) · [`TestTutorProviderFailure` L34](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/learning/tutor_test.go#L34) · [`TestTutorExcerptUnicode` L41](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/learning/tutor_test.go#L41)

### [backend/internal/learning/workflow_tools_test.go](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/learning/workflow_tools_test.go)

214 physical lines · **Test** · Test

[`TestBulkSectionsAtomicAndAudienceExclusions` L12](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/learning/workflow_tools_test.go#L12) · [`TestPersonalTimingDeadlinesAndCAS` L45](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/learning/workflow_tools_test.go#L45) · [`TestTrashRestorePermissionsWindowAndAudience` L92](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/learning/workflow_tools_test.go#L92) · [`TestScheduledExamPublicationAndStaleVersion` L131](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/learning/workflow_tools_test.go#L131) · [`TestMaterialTrashRestoresOnlyItsLinksAndKeepsAudience` L165](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/learning/workflow_tools_test.go#L165) · [`TestPlannerIncludesStillOpenExamsWithoutOldDeadlines` L198](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/learning/workflow_tools_test.go#L198)

### [backend/internal/learning/workflows_test.go](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/learning/workflows_test.go)

100 physical lines · **Test** · Test

[`TestClassworkSearchCopyAndDraftPrivacy` L14](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/learning/workflows_test.go#L14) · [`TestAnnouncementSchedulingIsPrivateConflictSafeAndPublishesOnce` L50](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/learning/workflows_test.go#L50)

### [backend/internal/learning/workspace.go](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/learning/workspace.go)

114 physical lines · **Source/config** · Home classes/activity/upcoming/files aggregation

[`Workspace` L9](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/learning/workspace.go#L9) · [`WorkspaceFiles` L90](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/learning/workspace.go#L90)

### [backend/internal/learning/workspace_release_test.go](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/learning/workspace_release_test.go)

175 physical lines · **Test** · Test

[`releaseApp` L14](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/learning/workspace_release_test.go#L14) · [`TestTaskInboxMembershipPendingAndCompletedWork` L31](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/learning/workspace_release_test.go#L31) · [`TestStorageQuotaSerializesConcurrentUploads` L48](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/learning/workspace_release_test.go#L48) · [`TestAcademicReportPreviewPublicationPrivacyAndSnapshot` L84](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/learning/workspace_release_test.go#L84) · [`TestCoTeacherCapabilitiesCannotAlterOwnerOrPromoteStudent` L122](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/learning/workspace_release_test.go#L122)

### [backend/internal/learning/workspace_test.go](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/learning/workspace_test.go)

41 physical lines · **Test** · Test

[`TestWorkspaceIsolation` L12](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/learning/workspace_test.go#L12)

## backend/internal/messaging

### [backend/internal/messaging/controls_test.go](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/messaging/controls_test.go)

164 physical lines · **Test** · Test

[`TestThemesPermissionsAndAttachments` L15](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/messaging/controls_test.go#L15)

### [backend/internal/messaging/conversation_tools.go](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/messaging/conversation_tools.go)

130 physical lines · **Source/config** · conversation tools

[`Preferences` L11](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/messaging/conversation_tools.go#L11) · [`Pins` L47](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/messaging/conversation_tools.go#L47)

### [backend/internal/messaging/conversation_tools_test.go](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/messaging/conversation_tools_test.go)

101 physical lines · **Test** · Test

[`TestConversationMutePinsAndReadBoundary` L14](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/messaging/conversation_tools_test.go#L14)

### [backend/internal/messaging/files.go](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/messaging/files.go)

164 physical lines · **Source/config** · files

[`Attachment` L22](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/messaging/files.go#L22) · [`sendRequest` L27](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/messaging/files.go#L27) · [`parseMessage` L38](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/messaging/files.go#L38) · [`fileDirectory` L104](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/messaging/files.go#L104) · [`storeFile` L110](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/messaging/files.go#L110) · [`File` L125](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/messaging/files.go#L125)

### [backend/internal/messaging/handler.go](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/messaging/handler.go)

458 physical lines · **Source/config** · handler

[`Handler` L20](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/messaging/handler.go#L20) · [`Register` L22](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/messaging/handler.go#L22) · [`result` L57](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/messaging/handler.go#L57) · [`userID` L58](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/messaging/handler.go#L58) · [`member` L65](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/messaging/handler.go#L65) · [`thread` L87](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/messaging/handler.go#L87) · [`Unread` L105](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/messaging/handler.go#L105) · [`Classes` L117](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/messaging/handler.go#L117) · [`Recipients` L141](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/messaging/handler.go#L141) · [`Create` L164](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/messaging/handler.go#L164) · [`Conversations` L200](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/messaging/handler.go#L200) · [`Message` L226](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/messaging/handler.go#L226) · [`Reply` L243](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/messaging/handler.go#L243) · [`scan` L250](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/messaging/handler.go#L250) · [`History` L270](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/messaging/handler.go#L270) · [`Send` L317](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/messaging/handler.go#L317) · [`Read` L428](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/messaging/handler.go#L428) · [`replyID` L453](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/messaging/handler.go#L453)

### [backend/internal/messaging/handler_test.go](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/messaging/handler_test.go)

123 physical lines · **Test** · Test

[`TestClassConversationPrivacyAndDelivery` L14](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/messaging/handler_test.go#L14)

### [backend/internal/messaging/library.go](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/messaging/library.go)

51 physical lines · **Source/config** · library

[`Library` L11](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/messaging/library.go#L11)

### [backend/internal/messaging/library_test.go](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/messaging/library_test.go)

73 physical lines · **Test** · Test

[`TestSharedLibraryFiltersAndMembershipPrivacy` L15](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/messaging/library_test.go#L15)

### [backend/internal/messaging/message_tools.go](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/messaging/message_tools.go)

83 physical lines · **Source/config** · message tools

[`ChangeMessage` L14](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/messaging/message_tools.go#L14)

### [backend/internal/messaging/message_tools_test.go](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/messaging/message_tools_test.go)

77 physical lines · **Test** · Test

[`TestRepliesEditsSearchAndSeen` L14](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/messaging/message_tools_test.go#L14)

### [backend/internal/messaging/moderation.go](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/messaging/moderation.go)

180 physical lines · **Source/config** · moderation

[`Block` L12](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/messaging/moderation.go#L12) · [`ReportMessage` L51](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/messaging/moderation.go#L51) · [`Reports` L105](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/messaging/moderation.go#L105)

### [backend/internal/messaging/moderation_test.go](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/messaging/moderation_test.go)

81 physical lines · **Test** · Test

[`TestConversationBlockAndReportedMessageIsolation` L13](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/messaging/moderation_test.go#L13)

### [backend/internal/messaging/reactions.go](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/messaging/reactions.go)

70 physical lines · **Source/config** · reactions

[`Reaction` L8](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/messaging/reactions.go#L8) · [`validReaction` L13](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/messaging/reactions.go#L13) · [`React` L20](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/messaging/reactions.go#L20)

### [backend/internal/messaging/redteam_test.go](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/messaging/redteam_test.go)

74 physical lines · **Test** · Test

[`TestRedTeamConcurrentMessageAbuseAndRetry` L15](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/messaging/redteam_test.go#L15)

### [backend/internal/messaging/rich_messages.go](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/messaging/rich_messages.go)

51 physical lines · **Source/config** · rich messages

[`validateRichMessage` L10](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/messaging/rich_messages.go#L10)

### [backend/internal/messaging/rich_messages_test.go](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/messaging/rich_messages_test.go)

125 physical lines · **Test** · Test

[`TestRichMessageValidation` L17](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/messaging/rich_messages_test.go#L17) · [`TestRichMessagesAndPrivateStars` L30](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/messaging/rich_messages_test.go#L30)

### [backend/internal/messaging/settings.go](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/messaging/settings.go)

182 physical lines · **Source/config** · settings

[`queryer` L10](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/messaging/settings.go#L10) · [`canSend` L15](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/messaging/settings.go#L15) · [`teacher` L20](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/messaging/settings.go#L20) · [`Settings` L30](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/messaging/settings.go#L30) · [`Policy` L66](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/messaging/settings.go#L66) · [`StudentPolicy` L95](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/messaging/settings.go#L95) · [`validTheme` L139](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/messaging/settings.go#L139) · [`Theme` L146](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/messaging/settings.go#L146)

### [backend/internal/messaging/stars.go](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/messaging/stars.go)

61 physical lines · **Source/config** · stars

[`Stars` L9](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/messaging/stars.go#L9)

## backend/internal/notifications

### [backend/internal/notifications/delivery_integration_test.go](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/notifications/delivery_integration_test.go)

72 physical lines · **Test** · Test

[`recordingMailer` L9](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/notifications/delivery_integration_test.go#L9) · [`Send` L14](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/notifications/delivery_integration_test.go#L14) · [`TestNotificationOutboxAndReminders` L21](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/notifications/delivery_integration_test.go#L21)

### [backend/internal/notifications/digests.go](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/notifications/digests.go)

135 physical lines · **Source/config** · digests

[`prepareDigest` L13](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/notifications/digests.go#L13) · [`deliverDigest` L57](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/notifications/digests.go#L57)

### [backend/internal/notifications/list.go](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/notifications/list.go)

90 physical lines · **Source/config** · list

[`listFiltered` L10](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/notifications/list.go#L10)

### [backend/internal/notifications/notifications.go](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/notifications/notifications.go)

223 physical lines · **Source/config** · notifications

[`Handler` L20](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/notifications/notifications.go#L20) · [`Register` L26](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/notifications/notifications.go#L26) · [`userID` L39](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/notifications/notifications.go#L39) · [`result` L49](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/notifications/notifications.go#L49) · [`List` L56](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/notifications/notifications.go#L56) · [`Preferences` L57](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/notifications/notifications.go#L57) · [`SavePreferences` L70](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/notifications/notifications.go#L70) · [`ReadAll` L98](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/notifications/notifications.go#L98) · [`ReadOne` L109](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/notifications/notifications.go#L109) · [`emailBody` L136](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/notifications/notifications.go#L136) · [`run` L144](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/notifications/notifications.go#L144) · [`tick` L156](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/notifications/notifications.go#L156) · [`deliver` L200](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/notifications/notifications.go#L200)

### [backend/internal/notifications/notifications_test.go](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/notifications/notifications_test.go)

23 physical lines · **Test** · Test

[`TestEmailEscapesUntrustedContent` L8](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/notifications/notifications_test.go#L8) · [`TestEmailRejectsExternalRedirect` L18](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/notifications/notifications_test.go#L18)

### [backend/internal/notifications/push.go](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/notifications/push.go)

257 physical lines · **Source/config** · push

[`pushHandler` L19](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/notifications/push.go#L19) · [`registerPush` L24](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/notifications/push.go#L24) · [`status` L34](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/notifications/push.go#L34) · [`register` L59](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/notifications/push.go#L59) · [`nullableJSON` L140](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/notifications/push.go#L140) · [`remove` L146](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/notifications/push.go#L146) · [`runPush` L163](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/notifications/push.go#L163) · [`pollPush` L175](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/notifications/push.go#L175) · [`deliverPush` L192](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/notifications/push.go#L192) · [`shortPush` L251](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/notifications/push.go#L251)

### [backend/internal/notifications/push_sender.go](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/notifications/push_sender.go)

235 physical lines · **Source/config** · push sender

[`PushPayload` L25](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/notifications/push_sender.go#L25) · [`pushDevice` L33](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/notifications/push_sender.go#L33) · [`pushSender` L37](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/notifications/push_sender.go#L37) · [`newPushSender` L48](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/notifications/push_sender.go#L48) · [`webConfigured` L92](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/notifications/push_sender.go#L92) · [`androidConfigured` L93](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/notifications/push_sender.go#L93) · [`validPushEndpoint` L94](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/notifications/push_sender.go#L94) · [`validateSubscription` L102](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/notifications/push_sender.go#L102) · [`oauth` L121](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/notifications/push_sender.go#L121) · [`send` L158](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/notifications/push_sender.go#L158)

### [backend/internal/notifications/push_test.go](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/notifications/push_test.go)

268 physical lines · **Test** · Test

[`pushTransport` L24](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/notifications/push_test.go#L24) · [`TestConversationMuteSkipsMessagesButNotCalls` L26](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/notifications/push_test.go#L26) · [`RoundTrip` L86](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/notifications/push_test.go#L86) · [`TestPushOutboxHonorsPreferencesAndReadState` L88](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/notifications/push_test.go#L88) · [`TestPushEndpointRestrictions` L158](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/notifications/push_test.go#L158) · [`TestFCMDataOnlyDelivery` L174](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/notifications/push_test.go#L174) · [`TestPushDeviceBindingIsolation` L216](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/notifications/push_test.go#L216)

### [backend/internal/notifications/workflows_test.go](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/notifications/workflows_test.go)

134 physical lines · **Test** · Test

[`TestDigestFrequencyBatchingAndDeliveryPermissionChecks` L15](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/notifications/workflows_test.go#L15) · [`TestNotificationGroupingFiltersAndOwnedGroupRead` L73](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/notifications/workflows_test.go#L73)

## backend/internal/platform/audience

### [backend/internal/platform/audience/rule.go](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/platform/audience/rule.go)

196 physical lines · **Source/config** · rule

[`Range` L13](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/platform/audience/rule.go#L13) · [`Rule` L17](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/platform/audience/rule.go#L17) · [`Matches` L30](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/platform/audience/rule.go#L30) · [`compileRoll` L33](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/platform/audience/rule.go#L33) · [`Normalize` L89](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/platform/audience/rule.go#L89) · [`Encode` L173](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/platform/audience/rule.go#L173) · [`Compile` L181](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/platform/audience/rule.go#L181) · [`CompileMember` L185](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/platform/audience/rule.go#L185)

### [backend/internal/platform/audience/rule_test.go](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/platform/audience/rule_test.go)

83 physical lines · **Test** · Test

[`TestEveryoneIsOptionalDefault` L10](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/platform/audience/rule_test.go#L10) · [`TestRuleDatabaseParityAndBoundariesAgree` L26](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/platform/audience/rule_test.go#L26) · [`TestAudienceValidationAndCanonicalRolls` L50](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/platform/audience/rule_test.go#L50) · [`TestSectionIntersectionAgreesWithDatabase` L62](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/platform/audience/rule_test.go#L62)

## backend/internal/platform/config

### [backend/internal/platform/config/config.go](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/platform/config/config.go)

131 physical lines · **Source/config** · config

[`Config` L15](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/platform/config/config.go#L15) · [`Load` L40](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/platform/config/config.go#L40) · [`Validate` L76](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/platform/config/config.go#L76) · [`getEnv` L125](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/platform/config/config.go#L125)

### [backend/internal/platform/config/config_test.go](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/platform/config/config_test.go)

74 physical lines · **Test** · Test

[`TestValidateRejectsUnsafeSigningConfiguration` L9](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/platform/config/config_test.go#L9) · [`TestProductionConfigurationFailsClosed` L32](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/platform/config/config_test.go#L32)

## backend/internal/platform/contentrelease

### [backend/internal/platform/contentrelease/release.go](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/platform/contentrelease/release.go)

146 physical lines · **Source/config** · release

[`Save` L13](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/platform/contentrelease/release.go#L13) · [`LockResource` L25](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/platform/contentrelease/release.go#L25) · [`Publish` L46](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/platform/contentrelease/release.go#L46) · [`PublishOne` L74](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/platform/contentrelease/release.go#L74)

## backend/internal/platform/database

### [backend/internal/platform/database/config.go](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/platform/database/config.go)

34 physical lines · **Source/config** · config

[`Config` L9](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/platform/database/config.go#L9) · [`NewConfig` L18](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/platform/database/config.go#L18) · [`DSN` L29](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/platform/database/config.go#L29)

### [backend/internal/platform/database/connection.go](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/platform/database/connection.go)

25 physical lines · **Source/config** · connection

[`Connect` L10](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/platform/database/connection.go#L10)

### [backend/internal/platform/database/health.go](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/platform/database/health.go)

15 physical lines · **Source/config** · health

[`Health` L10](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/platform/database/health.go#L10)

## backend/internal/platform/database/sqlc

### [backend/internal/platform/database/sqlc/classroom_memberships.sql.go](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/platform/database/sqlc/classroom_memberships.sql.go)

349 physical lines · **Generated** · Generated

[`CreateClassroomMembershipParams` L28](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/platform/database/sqlc/classroom_memberships.sql.go#L28) · [`CreateClassroomMembership` L34](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/platform/database/sqlc/classroom_memberships.sql.go#L34) · [`DeleteClassroomMembershipParams` L59](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/platform/database/sqlc/classroom_memberships.sql.go#L59) · [`DeleteClassroomMembership` L64](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/platform/database/sqlc/classroom_memberships.sql.go#L64) · [`GetActiveClassroomMembershipParams` L81](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/platform/database/sqlc/classroom_memberships.sql.go#L81) · [`GetActiveClassroomMembership` L86](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/platform/database/sqlc/classroom_memberships.sql.go#L86) · [`GetClassroomMembershipParams` L113](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/platform/database/sqlc/classroom_memberships.sql.go#L113) · [`GetClassroomMembership` L118](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/platform/database/sqlc/classroom_memberships.sql.go#L118) · [`ListClassroomMembersParams` L167](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/platform/database/sqlc/classroom_memberships.sql.go#L167) · [`ListClassroomMembersRow` L173](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/platform/database/sqlc/classroom_memberships.sql.go#L173) · [`ListClassroomMembers` L189](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/platform/database/sqlc/classroom_memberships.sql.go#L189) · [`ListJoinedClassroomsParams` L241](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/platform/database/sqlc/classroom_memberships.sql.go#L241) · [`ListJoinedClassrooms` L247](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/platform/database/sqlc/classroom_memberships.sql.go#L247) · [`RemoveClassroomMembershipParams` L300](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/platform/database/sqlc/classroom_memberships.sql.go#L300) · [`RemoveClassroomMembership` L305](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/platform/database/sqlc/classroom_memberships.sql.go#L305) · [`RestoreClassroomMembershipParams` L326](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/platform/database/sqlc/classroom_memberships.sql.go#L326) · [`RestoreClassroomMembership` L332](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/platform/database/sqlc/classroom_memberships.sql.go#L332)

### [backend/internal/platform/database/sqlc/classroom_stream_posts.sql.go](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/platform/database/sqlc/classroom_stream_posts.sql.go)

354 physical lines · **Generated** · Generated

[`CreateClassroomAnnouncementParams` L34](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/platform/database/sqlc/classroom_stream_posts.sql.go#L34) · [`CreateClassroomAnnouncement` L42](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/platform/database/sqlc/classroom_stream_posts.sql.go#L42) · [`DeleteClassroomStreamPostParams` L79](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/platform/database/sqlc/classroom_stream_posts.sql.go#L79) · [`DeleteClassroomStreamPost` L84](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/platform/database/sqlc/classroom_stream_posts.sql.go#L84) · [`GetClassroomStreamPostByID` L100](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/platform/database/sqlc/classroom_stream_posts.sql.go#L100) · [`ListClassroomStreamPostsParams` L161](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/platform/database/sqlc/classroom_stream_posts.sql.go#L161) · [`ListClassroomStreamPostsRow` L168](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/platform/database/sqlc/classroom_stream_posts.sql.go#L168) · [`ListClassroomStreamPosts` L189](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/platform/database/sqlc/classroom_stream_posts.sql.go#L189) · [`PinClassroomStreamPostParams` L244](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/platform/database/sqlc/classroom_stream_posts.sql.go#L244) · [`PinClassroomStreamPost` L249](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/platform/database/sqlc/classroom_stream_posts.sql.go#L249) · [`UnpinClassroomStreamPostParams` L281](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/platform/database/sqlc/classroom_stream_posts.sql.go#L281) · [`UnpinClassroomStreamPost` L286](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/platform/database/sqlc/classroom_stream_posts.sql.go#L286) · [`UpdateClassroomAnnouncementParams` L321](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/platform/database/sqlc/classroom_stream_posts.sql.go#L321) · [`UpdateClassroomAnnouncement` L329](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/platform/database/sqlc/classroom_stream_posts.sql.go#L329)

### [backend/internal/platform/database/sqlc/classrooms.sql.go](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/platform/database/sqlc/classrooms.sql.go)

375 physical lines · **Generated** · Generated

[`ArchiveClassroom` L25](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/platform/database/sqlc/classrooms.sql.go#L25) · [`CreateClassroomParams` L76](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/platform/database/sqlc/classrooms.sql.go#L76) · [`CreateClassroom` L86](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/platform/database/sqlc/classrooms.sql.go#L86) · [`DeleteClassroom` L132](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/platform/database/sqlc/classrooms.sql.go#L132) · [`GetClassroomByCode` L149](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/platform/database/sqlc/classrooms.sql.go#L149) · [`GetClassroomByID` L186](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/platform/database/sqlc/classrooms.sql.go#L186) · [`ListClassroomsByOwnerParams` L230](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/platform/database/sqlc/classrooms.sql.go#L230) · [`ListClassroomsByOwner` L236](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/platform/database/sqlc/classrooms.sql.go#L236) · [`UnarchiveClassroom` L289](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/platform/database/sqlc/classrooms.sql.go#L289) · [`UpdateClassroomParams` L332](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/platform/database/sqlc/classrooms.sql.go#L332) · [`UpdateClassroom` L341](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/platform/database/sqlc/classrooms.sql.go#L341)

### [backend/internal/platform/database/sqlc/db.go](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/platform/database/sqlc/db.go)

32 physical lines · **Generated** · Generated

[`DBTX` L14](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/platform/database/sqlc/db.go#L14) · [`New` L20](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/platform/database/sqlc/db.go#L20) · [`Queries` L24](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/platform/database/sqlc/db.go#L24) · [`WithTx` L28](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/platform/database/sqlc/db.go#L28)

### [backend/internal/platform/database/sqlc/email_verification_tokens.sql.go](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/platform/database/sqlc/email_verification_tokens.sql.go)

101 physical lines · **Generated** · Generated

[`CreateEmailVerificationTokenParams` L28](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/platform/database/sqlc/email_verification_tokens.sql.go#L28) · [`CreateEmailVerificationToken` L34](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/platform/database/sqlc/email_verification_tokens.sql.go#L34) · [`DeleteUserEmailVerificationTokens` L53](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/platform/database/sqlc/email_verification_tokens.sql.go#L53) · [`GetEmailVerificationToken` L65](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/platform/database/sqlc/email_verification_tokens.sql.go#L65) · [`MarkUserEmailVerified` L87](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/platform/database/sqlc/email_verification_tokens.sql.go#L87) · [`VerifyEmailToken` L98](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/platform/database/sqlc/email_verification_tokens.sql.go#L98)

### [backend/internal/platform/database/sqlc/models.go](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/platform/database/sqlc/models.go)

985 physical lines · **Generated** · Generated

[`AcademicTerm` L11](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/platform/database/sqlc/models.go#L11) · [`AccountSecurity` L20](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/platform/database/sqlc/models.go#L20) · [`AuthSession` L34](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/platform/database/sqlc/models.go#L34) · [`CalendarReminder` L45](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/platform/database/sqlc/models.go#L45) · [`Classroom` L54](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/platform/database/sqlc/models.go#L54) · [`ClassroomAcademicReport` L78](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/platform/database/sqlc/models.go#L78) · [`ClassroomAcademicReportEvent` L92](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/platform/database/sqlc/models.go#L92) · [`ClassroomAccommodation` L101](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/platform/database/sqlc/models.go#L101) · [`ClassroomActivity` L113](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/platform/database/sqlc/models.go#L113) · [`ClassroomAnnouncementDraft` L127](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/platform/database/sqlc/models.go#L127) · [`ClassroomAssignment` L143](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/platform/database/sqlc/models.go#L143) · [`ClassroomAssignmentSubmission` L159](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/platform/database/sqlc/models.go#L159) · [`ClassroomAttendance` L176](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/platform/database/sqlc/models.go#L176) · [`ClassroomBulkOperation` L185](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/platform/database/sqlc/models.go#L185) · [`ClassroomCalendarEvent` L194](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/platform/database/sqlc/models.go#L194) · [`ClassroomCall` L205](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/platform/database/sqlc/models.go#L205) · [`ClassroomCallSignal` L225](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/platform/database/sqlc/models.go#L225) · [`ClassroomContentSchedule` L235](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/platform/database/sqlc/models.go#L235) · [`ClassroomConversation` L250](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/platform/database/sqlc/models.go#L250) · [`ClassroomExam` L260](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/platform/database/sqlc/models.go#L260) · [`ClassroomExamActivityEvent` L278](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/platform/database/sqlc/models.go#L278) · [`ClassroomExamAttempt` L287](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/platform/database/sqlc/models.go#L287) · [`ClassroomExamCodeRun` L301](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/platform/database/sqlc/models.go#L301) · [`ClassroomExamDesktopEvent` L314](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/platform/database/sqlc/models.go#L314) · [`ClassroomExamDesktopPreflight` L323](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/platform/database/sqlc/models.go#L323) · [`ClassroomExamDesktopSession` L335](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/platform/database/sqlc/models.go#L335) · [`ClassroomExamMarksheet` L347](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/platform/database/sqlc/models.go#L347) · [`ClassroomExamMonitorAdmission` L353](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/platform/database/sqlc/models.go#L353) · [`ClassroomExamMonitorEvent` L359](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/platform/database/sqlc/models.go#L359) · [`ClassroomExamMonitorHeartbeat` L371](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/platform/database/sqlc/models.go#L371) · [`ClassroomExamMonitorPolicy` L378](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/platform/database/sqlc/models.go#L378) · [`ClassroomExamQuestionMark` L385](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/platform/database/sqlc/models.go#L385) · [`ClassroomExamResultPublication` L395](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/platform/database/sqlc/models.go#L395) · [`ClassroomExamReviewSetting` L401](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/platform/database/sqlc/models.go#L401) · [`ClassroomGradingTemplate` L408](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/platform/database/sqlc/models.go#L408) · [`ClassroomInvitationEvent` L418](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/platform/database/sqlc/models.go#L418) · [`ClassroomJoinRequest` L426](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/platform/database/sqlc/models.go#L426) · [`ClassroomJoinRequestEvent` L439](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/platform/database/sqlc/models.go#L439) · [`ClassroomMaterial` L448](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/platform/database/sqlc/models.go#L448) · [`ClassroomMaterialAccessibility` L462](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/platform/database/sqlc/models.go#L462) · [`ClassroomMaterialTrash` L474](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/platform/database/sqlc/models.go#L474) · [`ClassroomMembership` L480](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/platform/database/sqlc/models.go#L480) · [`ClassroomMessage` L494](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/platform/database/sqlc/models.go#L494) · [`ClassroomMessageReaction` L514](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/platform/database/sqlc/models.go#L514) · [`ClassroomMessageReport` L521](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/platform/database/sqlc/models.go#L521) · [`ClassroomMessageReportEvent` L538](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/platform/database/sqlc/models.go#L538) · [`ClassroomMessageStar` L547](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/platform/database/sqlc/models.go#L547) · [`ClassroomMessageTheme` L553](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/platform/database/sqlc/models.go#L553) · [`ClassroomMessagingPolicy` L559](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/platform/database/sqlc/models.go#L559) · [`ClassroomMessagingRestriction` L566](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/platform/database/sqlc/models.go#L566) · [`ClassroomQuestionBank` L573](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/platform/database/sqlc/models.go#L573) · [`ClassroomQuestionTester` L585](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/platform/database/sqlc/models.go#L585) · [`ClassroomRecheck` L595](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/platform/database/sqlc/models.go#L595) · [`ClassroomRecheckEvent` L611](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/platform/database/sqlc/models.go#L611) · [`ClassroomRollover` L621](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/platform/database/sqlc/models.go#L621) · [`ClassroomRosterEvent` L629](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/platform/database/sqlc/models.go#L629) · [`ClassroomSection` L640](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/platform/database/sqlc/models.go#L640) · [`ClassroomSharedMessageTheme` L648](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/platform/database/sqlc/models.go#L648) · [`ClassroomSimilarityReview` L655](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/platform/database/sqlc/models.go#L655) · [`ClassroomStaffPermission` L664](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/platform/database/sqlc/models.go#L664) · [`ClassroomStreamPost` L672](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/platform/database/sqlc/models.go#L672) · [`ClassroomStudentInvitation` L688](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/platform/database/sqlc/models.go#L688) · [`ClassroomTesterTicket` L705](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/platform/database/sqlc/models.go#L705) · [`ClassroomTopic` L713](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/platform/database/sqlc/models.go#L713) · [`ClassroomTopicResource` L721](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/platform/database/sqlc/models.go#L721) · [`ClassroomTutorMessage` L728](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/platform/database/sqlc/models.go#L728) · [`ClassroomTutorSource` L740](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/platform/database/sqlc/models.go#L740) · [`ConversationBlock` L751](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/platform/database/sqlc/models.go#L751) · [`ConversationMessageTheme` L757](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/platform/database/sqlc/models.go#L757) · [`ConversationPin` L763](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/platform/database/sqlc/models.go#L763) · [`ConversationPreference` L770](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/platform/database/sqlc/models.go#L770) · [`ConversationSharedMessageTheme` L776](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/platform/database/sqlc/models.go#L776) · [`EmailVerificationToken` L783](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/platform/database/sqlc/models.go#L783) · [`Institution` L792](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/platform/database/sqlc/models.go#L792) · [`InstitutionActivity` L800](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/platform/database/sqlc/models.go#L800) · [`InstitutionClassroom` L813](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/platform/database/sqlc/models.go#L813) · [`InstitutionDepartment` L822](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/platform/database/sqlc/models.go#L822) · [`InstitutionInvitation` L829](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/platform/database/sqlc/models.go#L829) · [`InstitutionMember` L841](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/platform/database/sqlc/models.go#L841) · [`InstitutionTerm` L850](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/platform/database/sqlc/models.go#L850) · [`NotificationDevice` L859](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/platform/database/sqlc/models.go#L859) · [`NotificationEmailDigest` L872](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/platform/database/sqlc/models.go#L872) · [`NotificationPreference` L884](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/platform/database/sqlc/models.go#L884) · [`NotificationPushOutbox` L893](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/platform/database/sqlc/models.go#L893) · [`PasswordResetToken` L902](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/platform/database/sqlc/models.go#L902) · [`PersonalWorkspaceFile` L911](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/platform/database/sqlc/models.go#L911) · [`PersonalWorkspaceItem` L919](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/platform/database/sqlc/models.go#L919) · [`RealtimeTicket` L934](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/platform/database/sqlc/models.go#L934) · [`RefreshToken` L943](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/platform/database/sqlc/models.go#L943) · [`User` L953](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/platform/database/sqlc/models.go#L953) · [`UserNotification` L970](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/platform/database/sqlc/models.go#L970)

### [backend/internal/platform/database/sqlc/password_reset_tokens.sql.go](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/platform/database/sqlc/password_reset_tokens.sql.go)

89 physical lines · **Generated** · Generated

[`CreatePasswordResetTokenParams` L28](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/platform/database/sqlc/password_reset_tokens.sql.go#L28) · [`CreatePasswordResetToken` L34](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/platform/database/sqlc/password_reset_tokens.sql.go#L34) · [`DeleteUserPasswordResetTokens` L54](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/platform/database/sqlc/password_reset_tokens.sql.go#L54) · [`GetPasswordResetToken` L66](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/platform/database/sqlc/password_reset_tokens.sql.go#L66) · [`UsePasswordResetToken` L86](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/platform/database/sqlc/password_reset_tokens.sql.go#L86)

### [backend/internal/platform/database/sqlc/querier.go](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/platform/database/sqlc/querier.go)

57 physical lines · **Generated** · Generated

[`Querier` L13](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/platform/database/sqlc/querier.go#L13)

### [backend/internal/platform/database/sqlc/refresh_tokens.sql.go](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/platform/database/sqlc/refresh_tokens.sql.go)

91 physical lines · **Generated** · Generated

[`CreateRefreshTokenParams` L28](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/platform/database/sqlc/refresh_tokens.sql.go#L28) · [`CreateRefreshToken` L34](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/platform/database/sqlc/refresh_tokens.sql.go#L34) · [`GetRefreshToken` L56](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/platform/database/sqlc/refresh_tokens.sql.go#L56) · [`RevokeAllUserRefreshTokens` L77](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/platform/database/sqlc/refresh_tokens.sql.go#L77) · [`RevokeRefreshToken` L88](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/platform/database/sqlc/refresh_tokens.sql.go#L88)

### [backend/internal/platform/database/sqlc/users.sql.go](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/platform/database/sqlc/users.sql.go)

197 physical lines · **Generated** · Generated

[`CreateUserParams` L36](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/platform/database/sqlc/users.sql.go#L36) · [`CreateUser` L46](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/platform/database/sqlc/users.sql.go#L46) · [`GetUserByEmail` L83](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/platform/database/sqlc/users.sql.go#L83) · [`GetUserByID` L111](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/platform/database/sqlc/users.sql.go#L111) · [`UpdatePasswordParams` L141](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/platform/database/sqlc/users.sql.go#L141) · [`UpdatePassword` L146](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/platform/database/sqlc/users.sql.go#L146) · [`UpdateUserProfileParams` L163](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/platform/database/sqlc/users.sql.go#L163) · [`UpdateUserProfile` L171](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/platform/database/sqlc/users.sql.go#L171)

## backend/internal/platform/errors

### [backend/internal/platform/errors/errors.go](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/platform/errors/errors.go)

32 physical lines · **Source/config** · errors

[`Handler` L10](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/platform/errors/errors.go#L10)

### [backend/internal/platform/errors/errors_test.go](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/platform/errors/errors_test.go)

24 physical lines · **Test** · Test

[`TestUnexpectedErrorsDoNotExposeDatabaseDetails` L12](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/platform/errors/errors_test.go#L12)

## backend/internal/platform/institutions

### [backend/internal/platform/institutions/placement.go](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/platform/institutions/placement.go)

167 physical lines · **Source/config** · placement

[`Placement` L15](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/platform/institutions/placement.go#L15) · [`Normalize` L21](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/platform/institutions/placement.go#L21) · [`Record` L40](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/platform/institutions/placement.go#L40) · [`Lock` L55](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/platform/institutions/placement.go#L55) · [`Place` L70](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/platform/institutions/placement.go#L70)

## backend/internal/platform/logger

### [backend/internal/platform/logger/logger.go](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/platform/logger/logger.go)

29 physical lines · **Source/config** · logger

[`New` L10](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/platform/logger/logger.go#L10) · [`NewPretty` L18](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/platform/logger/logger.go#L18)

## backend/internal/platform/mail

### [backend/internal/platform/mail/mailer.go](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/platform/mail/mailer.go)

9 physical lines · **Source/config** · mailer

[`Mailer` L3](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/platform/mail/mailer.go#L3)

### [backend/internal/platform/mail/smtp.go](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/platform/mail/smtp.go)

122 physical lines · **Source/config** · smtp

[`SMTPMailer` L12](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/platform/mail/smtp.go#L12) · [`NewSMTPMailer` L20](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/platform/mail/smtp.go#L20) · [`Send` L36](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/platform/mail/smtp.go#L36) · [`secureSMTP` L108](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/platform/mail/smtp.go#L108)

### [backend/internal/platform/mail/smtp_test.go](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/platform/mail/smtp_test.go)

41 physical lines · **Test** · Test

[`TestRemoteSMTPRejectsTLSStripping` L13](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/platform/mail/smtp_test.go#L13)

## backend/internal/platform/middleware

### [backend/internal/platform/middleware/auth.go](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/platform/middleware/auth.go)

63 physical lines · **Source/config** · Request pipeline policy: auth

[`Protected` L11](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/platform/middleware/auth.go#L11)

### [backend/internal/platform/middleware/auth_budgets.go](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/platform/middleware/auth_budgets.go)

121 physical lines · **Source/config** · Request pipeline policy: auth_budgets

[`authBudgetKey` L20](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/platform/middleware/auth_budgets.go#L20) · [`authBudgetEmail` L26](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/platform/middleware/auth_budgets.go#L26) · [`AuthBudgets` L51](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/platform/middleware/auth_budgets.go#L51)

### [backend/internal/platform/middleware/cors.go](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/platform/middleware/cors.go)

17 physical lines · **Source/config** · Request pipeline policy: cors

[`CORS` L10](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/platform/middleware/cors.go#L10)

### [backend/internal/platform/middleware/logger.go](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/platform/middleware/logger.go)

14 physical lines · **Source/config** · Request pipeline policy: logger

[`Logger` L8](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/platform/middleware/logger.go#L8)

### [backend/internal/platform/middleware/production_test.go](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/platform/middleware/production_test.go)

199 physical lines · **Test** · Test

[`TestSharedBudgetsAcrossReplicasAndRotatingIPs` L18](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/platform/middleware/production_test.go#L18) · [`TestSharedIPBudgetRejectsForgedProxyMetadata` L110](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/platform/middleware/production_test.go#L110) · [`TestAuthBudgetsFailClosedAndRejectOversizedBodies` L141](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/platform/middleware/production_test.go#L141) · [`TestProductionCORSAndEncodedBodyBoundary` L166](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/platform/middleware/production_test.go#L166)

### [backend/internal/platform/middleware/recover.go](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/platform/middleware/recover.go)

18 physical lines · **Source/config** · Request pipeline policy: recover

[`Recover` L11](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/platform/middleware/recover.go#L11)

### [backend/internal/platform/middleware/register.go](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/platform/middleware/register.go)

14 physical lines · **Source/config** · Request pipeline policy: register

[`Register` L8](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/platform/middleware/register.go#L8)

### [backend/internal/platform/middleware/request_body.go](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/platform/middleware/request_body.go)

27 physical lines · **Source/config** · Request pipeline policy: request_body

[`IdentityRequestBody` L12](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/platform/middleware/request_body.go#L12)

### [backend/internal/platform/middleware/requestid.go](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/platform/middleware/requestid.go)

10 physical lines · **Source/config** · Request pipeline policy: requestid

[`RequestID` L8](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/platform/middleware/requestid.go#L8)

## backend/internal/platform/observability

### [backend/internal/platform/observability/observability.go](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/platform/observability/observability.go)

83 physical lines · **Source/config** · observability

[`Counters` L19](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/platform/observability/observability.go#L19) · [`Middleware` L23](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/platform/observability/observability.go#L23) · [`Register` L45](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/platform/observability/observability.go#L45)

### [backend/internal/platform/observability/observability_test.go](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/platform/observability/observability_test.go)

53 physical lines · **Test** · Test

[`TestMetricsRequireOperatorSecretAndHideUserContent` L12](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/platform/observability/observability_test.go#L12) · [`TestRecoveredPanicsCountAsServerErrors` L39](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/platform/observability/observability_test.go#L39)

## backend/internal/platform/requestidentity

### [backend/internal/platform/requestidentity/client.go](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/platform/requestidentity/client.go)

20 physical lines · **Source/config** · client

[`ClientIP` L12](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/platform/requestidentity/client.go#L12)

### [backend/internal/platform/requestidentity/client_test.go](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/platform/requestidentity/client_test.go)

31 physical lines · **Test** · Test

[`TestOnlyAuthenticatedProxyMetadataSelectsClientIP` L10](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/platform/requestidentity/client_test.go#L10)

## backend/internal/platform/response

### [backend/internal/platform/response/response.go](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/platform/response/response.go)

27 physical lines · **Source/config** · response

[`APIResponse` L5](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/platform/response/response.go#L5) · [`Success` L13](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/platform/response/response.go#L13) · [`Error` L21](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/platform/response/response.go#L21)

## backend/internal/platform/router

### [backend/internal/platform/router/router.go](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/platform/router/router.go)

208 physical lines · **Source/config** · Dependency wiring ও সব active module registration

[`Register` L35](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/platform/router/router.go#L35)

## backend/internal/platform/security

### [backend/internal/platform/security/jwt.go](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/platform/security/jwt.go)

123 physical lines · **Source/config** · Authentication/cryptographic helper: jwt

[`JWTService` L12](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/platform/security/jwt.go#L12) · [`Claims` L19](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/platform/security/jwt.go#L19) · [`NewJWT` L27](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/platform/security/jwt.go#L27) · [`GenerateToken` L41](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/platform/security/jwt.go#L41) · [`ConfigureSessions` L48](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/platform/security/jwt.go#L48) · [`GenerateSessionToken` L49](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/platform/security/jwt.go#L49) · [`ParseToken` L72](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/platform/security/jwt.go#L72)

### [backend/internal/platform/security/password.go](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/platform/security/password.go)

16 physical lines · **Source/config** · Authentication/cryptographic helper: password

[`HashPassword` L5](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/platform/security/password.go#L5) · [`CheckPassword` L14](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/platform/security/password.go#L14)

### [backend/internal/platform/security/token.go](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/platform/security/token.go)

17 physical lines · **Source/config** · Authentication/cryptographic helper: token

[`GenerateRefreshToken` L8](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/platform/security/token.go#L8)

### [backend/internal/platform/security/totp.go](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/platform/security/totp.go)

39 physical lines · **Source/config** · Authentication/cryptographic helper: totp

[`TOTP` L15](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/platform/security/totp.go#L15) · [`CheckTOTP` L25](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/platform/security/totp.go#L25)

### [backend/internal/platform/security/totp_test.go](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/platform/security/totp_test.go)

30 physical lines · **Test** · Test

[`TestTOTPRFC6238VectorsAndReplay` L8](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/platform/security/totp_test.go#L8)

## backend/internal/platform/server

### [backend/internal/platform/server/audience_integration_test.go](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/platform/server/audience_integration_test.go)

190 physical lines · **Test** · Test

[`TestRollAudienceAcrossRegisteredRoutes` L20](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/platform/server/audience_integration_test.go#L20)

### [backend/internal/platform/server/production_test.go](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/platform/server/production_test.go)

103 physical lines · **Test** · Test

[`TestProductionRouterAppliesSharedSecurityPolicies` L19](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/platform/server/production_test.go#L19)

### [backend/internal/platform/server/real_database_test.go](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/platform/server/real_database_test.go)

95 physical lines · **Test** · Test

[`TestExistingDatabaseReadOnlyRoutes` L19](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/platform/server/real_database_test.go#L19)

### [backend/internal/platform/server/realtime_integration_test.go](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/platform/server/realtime_integration_test.go)

116 physical lines · **Test** · Test

[`TestCompleteRouterRealtimeDelivery` L21](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/platform/server/realtime_integration_test.go#L21)

### [backend/internal/platform/server/recovery_restore_test.go](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/platform/server/recovery_restore_test.go)

97 physical lines · **Test** · Test

[`TestRedTeamRestoredApplication` L18](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/platform/server/recovery_restore_test.go#L18)

### [backend/internal/platform/server/redteam_test.go](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/platform/server/redteam_test.go)

126 physical lines · **Test** · Test

[`TestRedTeamRegisteredRoutePermissionMatrix` L20](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/platform/server/redteam_test.go#L20)

### [backend/internal/platform/server/server.go](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/platform/server/server.go)

53 physical lines · **Source/config** · Fiber app, middleware, security headers ও production budgets

[`New` L16](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/platform/server/server.go#L16)

## backend/internal/platform/validator

### [backend/internal/platform/validator/validator.go](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/platform/validator/validator.go)

9 physical lines · **Source/config** · validator

[`Validate` L7](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/platform/validator/validator.go#L7)

## backend/internal/realtime

### [backend/internal/realtime/realtime.go](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/realtime/realtime.go)

332 physical lines · **Source/config** · realtime

[`Event` L26](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/realtime/realtime.go#L26) · [`client` L34](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/realtime/realtime.go#L34) · [`close` L41](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/realtime/realtime.go#L41) · [`Hub` L43](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/realtime/realtime.go#L43) · [`Register` L52](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/realtime/realtime.go#L52) · [`hash` L68](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/realtime/realtime.go#L68) · [`ticket` L69](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/realtime/realtime.go#L69) · [`allowedOrigin` L118](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/realtime/realtime.go#L118) · [`upgrade` L139](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/realtime/realtime.go#L139) · [`broadcast` L170](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/realtime/realtime.go#L170) · [`socket` L188](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/realtime/realtime.go#L188) · [`sessionAllowed` L278](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/realtime/realtime.go#L278) · [`listen` L290](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/realtime/realtime.go#L290) · [`setAvailable` L323](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/realtime/realtime.go#L323)

### [backend/internal/realtime/realtime_test.go](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/realtime/realtime_test.go)

175 physical lines · **Test** · Test

[`TestConcurrentTicketRequestsRespectAccountBudget` L20](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/realtime/realtime_test.go#L20) · [`TestTicketIssuanceReclaimsExpiredBudgetAndRejectsInactiveAccount` L57](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/realtime/realtime_test.go#L57) · [`TestOrigins` L93](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/realtime/realtime_test.go#L93) · [`TestWebsocketTicketsAndDelivery` L109](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/realtime/realtime_test.go#L109)

## backend/internal/releases

### [backend/internal/releases/releases.go](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/releases/releases.go)

52 physical lines · **Source/config** · releases

[`Manifest` L13](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/releases/releases.go#L13) · [`valid` L25](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/releases/releases.go#L25) · [`Register` L33](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/releases/releases.go#L33)

### [backend/internal/releases/releases_test.go](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/releases/releases_test.go)

35 physical lines · **Test** · Test

[`TestReleaseDownloadBoundary` L8](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/releases/releases_test.go#L8) · [`TestNewReleasesRequireBoundedIntegrityMetadata` L21](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/releases/releases_test.go#L21)

## backend/internal/testsupport

### [backend/internal/testsupport/database.go](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/testsupport/database.go)

58 physical lines · **Source/config** · database

[`Fixture` L12](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/testsupport/database.go#L12) · [`Database` L17](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/internal/testsupport/database.go#L17)

## backend

### [backend/sqlc.yaml](https://github.com/al-fardin/EduNexusF/blob/88658db216433a6acb46d3cbffead422735368a6/backend/sqlc.yaml)

15 physical lines · **Source/config** · SQL source → generated typed pgx query code configuration
