
const SUPABASE_URL = "https://llfnlkjogamkqonnelsf.supabase.co";
const SUPABASE_KEY = "sb_publishable_oTSFR8fjnB3FVHswb8qQPg_CW6UjO4G";
const ADMIN_UID = "63e850ca-63f4-43cd-8c53-a67892492db3";

const supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);

const form = document.getElementById("article-form");
const message = document.getElementById("message");
const articleList = document.getElementById("admin-articles");

const titleInput = document.getElementById("title");
const descriptionInput = document.getElementById("description");
const contentInput = document.getElementById("content");
const imageInput = document.getElementById("image");

let isAdmin = false;
let articles = [];
let editingArticleId = null;
let currentImageUrl = null;

// HTMLとして危険な文字を無害化
function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[char]);
}

// 投稿ボタン
const submitButton = form.querySelector('button[type="submit"]');
submitButton.type = "submit";

// 編集キャンセルボタンを追加
const cancelButton = document.createElement("button");
cancelButton.type = "button";
cancelButton.textContent = "CANCEL EDIT";
cancelButton.style.display = "none";
form.appendChild(cancelButton);

cancelButton.addEventListener("click", cancelEdit);

// 管理者確認
async function checkAdmin() {
    const { data, error } = await supabaseClient.auth.getUser();

    if (error || !data.user || data.user.id !== ADMIN_UID) {
        alert("管理者としてログインしてください。");
        window.location.href = "admin.html";
        return;
    }

    isAdmin = true;
    loadAdminArticles();
}

// 記事一覧
async function loadAdminArticles() {
    const { data, error } = await supabaseClient
        .from("articles")
        .select("*")
        .order("created_at", { ascending: false });

    if (error) {
        articleList.textContent = "記事の読み込みに失敗しました。";
        console.error(error);
        return;
    }

    articles = data || [];

    articleList.innerHTML = articles.map(article => `
        <div class="article-card">
            <h3>${escapeHTML(article.title)}</h3>
            <p>${escapeHTML(article.description)}</p>

            <button type="button" data-action="edit" data-id="${Number(article.id)}">
                EDIT
            </button>

            <button type="button" data-action="delete" data-id="${Number(article.id)}">
                DELETE
            </button>
        </div>
    `).join("");
}

// 記事一覧のボタン操作
articleList.addEventListener("click", event => {
    const button = event.target.closest("button[data-action]");
    if (!button) return;

    const id = Number(button.dataset.id);

    if (button.dataset.action === "edit") {
        editArticle(id);
    }

    if (button.dataset.action === "delete") {
        deleteArticle(id);
    }
});

// 記事編集
function editArticle(id) {
    if (!isAdmin) return;

    const article = articles.find(item => Number(item.id) === id);

    if (!article) {
        alert("記事が見つかりません。");
        return;
    }

    editingArticleId = id;
    currentImageUrl = article.image_url;

    titleInput.value = article.title || "";
    descriptionInput.value = article.description || "";
    contentInput.value = article.content || "";

    imageInput.value = "";

    submitButton.textContent = "UPDATE ARTICLE";
    cancelButton.style.display = "block";

    message.textContent = "編集中：「" + article.title + "」";

    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });
}

// 編集キャンセル
function cancelEdit() {
    editingArticleId = null;
    currentImageUrl = null;

    form.reset();

    submitButton.textContent = "PUBLISH ARTICLE";
    cancelButton.style.display = "none";

    message.textContent = "編集をキャンセルしました。";
}

// 記事投稿・更新
form.addEventListener("submit", async event => {
    event.preventDefault();

    if (!isAdmin) return;

    message.textContent = editingArticleId
        ? "記事を更新中..."
        : "投稿中...";

    const title = titleInput.value;
    const description = descriptionInput.value;
    const content = contentInput.value;
    const imageFile = imageInput.files[0];

    // 画像URL
    let imageUrl = editingArticleId ? currentImageUrl : null;

    // 新しい画像が選択されている場合
    if (imageFile) {
        const extension = imageFile.name.split(".").pop();
        const filePath = `${crypto.randomUUID()}.${extension}`;

        const { error: uploadError } = await supabaseClient
            .storage
            .from("article-images")
            .upload(filePath, imageFile);

        if (uploadError) {
            message.textContent = "画像アップロード失敗";
            console.error(uploadError);
            return;
        }

        const { data } = supabaseClient
            .storage
            .from("article-images")
            .getPublicUrl(filePath);

        imageUrl = data.publicUrl;
    }

    let error;

    if (editingArticleId) {
        // 既存記事を更新
        const result = await supabaseClient
            .from("articles")
            .update({
                title,
                description,
                content,
                image_url: imageUrl
            })
            .eq("id", editingArticleId);

        error = result.error;

    } else {
        // 新しい記事を投稿
        const result = await supabaseClient
            .from("articles")
            .insert([{
                title,
                description,
                content,
                image_url: imageUrl
            }]);

        error = result.error;
    }

    if (error) {
        message.textContent = editingArticleId
            ? "記事の更新に失敗しました。"
            : "記事の投稿に失敗しました。";

        console.error(error);
        return;
    }

    message.textContent = editingArticleId
        ? "記事を更新しました！"
        : "記事を投稿しました！";

    editingArticleId = null;
    currentImageUrl = null;

    form.reset();

    submitButton.textContent = "PUBLISH ARTICLE";
    cancelButton.style.display = "none";

    await loadAdminArticles();
});

// 記事削除
async function deleteArticle(id) {
    if (!isAdmin) return;
    if (!confirm("この記事を削除しますか？")) return;

    const { error } = await supabaseClient
        .from("articles")
        .delete()
        .eq("id", id);

    if (error) {
        alert("削除に失敗しました。");
        console.error(error);
        return;
    }

    if (editingArticleId === id) {
        cancelEdit();
    }

    message.textContent = "記事を削除しました！";
    loadAdminArticles();
}

// ログアウト
document.getElementById("logout-button")
    .addEventListener("click", async () => {
        await supabaseClient.auth.signOut();
        window.location.href = "admin.html";
    });

// 起動
checkAdmin();
