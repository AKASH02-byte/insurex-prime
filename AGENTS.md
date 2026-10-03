<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Repository layout: `admin-web/` (login, admin and agent portals), `public-web/` (the public landing page) and `backend/` (API). It is a pnpm workspace: install once at the root and use `pnpm --filter <admin-web|public-web|backend> <script>`.
- Keep the public InsuroX experience in `public-web/` as one anchored landing page; its Login links point to `admin-web`'s `/login` via `VITE_ADMIN_WEB_URL`.
