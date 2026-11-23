
const SUPABASE_URL = "https://llfnlkjogamkqonnelsf.supabase.co";
const SUPABASE_KEY = "sb_publishable_oTSFR8fjnB3FVHswb8qQPg_CW6UjO4G";

const supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);

let articles = [];
let userId = null;
let likedArticles = new Set();

const container = document.getElementById("articles");

function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[char]);
}

// 匿名ログイン
async function initializeUser() {
    let { data: { session }, error } =
        await supabaseClient.auth.getSession();

    if (error) throw error;

    if (!session) {
        const result = await supabaseClient.auth.signInAnonymously();

        if (result.error) throw result.error;

        session = result.data.session;
    }

    userId = session.user.id;
}

// 記事といいね情報を取得
async function loadArticles() {
    container.innerHTML = "<p>記事を読み込み中...</p>";

    try {
        await initializeUser();

        const { data, error } = await supabaseClient
            .from("articles")
            .select("*")
            .order("created_at", { ascending: false });

        if (error) throw error;

        articles = data.map(item => ({
            id: item.id,
            title: item.title,
            date: item.created_at
                ? new Date(item.created_at).toLocaleDateString("ja-JP")
                : "",
            description: item.description || "",
            content: item.content || "",
            image: item.image_url || "",
            likes: 0
        }));

        const { data: likeData, error: likeError } =
            await supabaseClient
                .from("article_likes")
                .select("article_id, voter_id");

        if (likeError) throw likeError;

        likedArticles.clear();

        articles.forEach(article => {
            article.likes = likeData.filter(
                like => Number(like.article_id) === Number(article.id)
            ).length;
        });

        likeData.forEach(like => {
            if (like.voter_id === userId) {
                likedArticles.add(Number(like.article_id));
            }
        });

        displayArticles();

    } catch (error) {
        console.error("読み込み失敗:", error);
        container.innerHTML =
            "<p>記事を読み込めませんでした。再読み込みしてください。</p>";
    }
}

// 記事一覧
function displayArticles() {
    container.innerHTML = `
        <h2>ARTICLES</h2>
        <div class="article-list">
            ${articles.length === 0
                ? "<p>まだ記事はありません。</p>"
                : articles.map(article => `
                    <article class="article-card">
                        ${article.image
                            ? `<img src="${escapeHTML(article.image)}" alt="${escapeHTML(article.title)}">`
                            : ""}
                        <p class="article-date">${escapeHTML(article.date)}</p>
                        <h3>${escapeHTML(article.title)}</h3>
                        <p>${escapeHTML(article.description)}</p>
                        <button onclick="openArticle(${Number(article.id)})">
                            READ MORE →
                        </button>
                    </article>
                `).join("")
            }
        </div>
    `;
}

// 記事詳細
function openArticle(id) {
    const article = articles.find(item => Number(item.id) === Number(id));
    if (!article) return;

    const isLiked = likedArticles.has(Number(id));

    container.innerHTML = `
        <button onclick="displayArticles()">← BACK</button>
        <article class="full-article">
            <p class="article-date">${escapeHTML(article.date)}</p>
            <h2>${escapeHTML(article.title)}</h2>
            ${article.image
                ? `<img src="${escapeHTML(article.image)}" alt="${escapeHTML(article.title)}">`
                : ""}
            <div class="article-content">${escapeHTML(article.content).replace(/\n/g, "<br>")}</div>

            <button id="like-button" onclick="likeArticle(${Number(article.id)})">
                ${isLiked ? "♥" : "♡"} ${article.likes}
            </button>
        </article>
    `;
}

// いいね ON / OFF
async function likeArticle(id) {
    const article = articles.find(item => Number(item.id) === Number(id));
    if (!article || !userId) return;

    const button = document.getElementById("like-button");
    if (!button || button.disabled) return;

    button.disabled = true;

    const alreadyLiked = likedArticles.has(Number(id));

    try {
        if (alreadyLiked) {
            // いいね解除
            const { error } = await supabaseClient
                .from("article_likes")
                .delete()
                .eq("article_id", id)
                .eq("voter_id", userId);

            if (error) throw error;

            likedArticles.delete(Number(id));
            article.likes = Math.max(0, article.likes - 1);

        } else {
            // いいね登録
            const { error } = await supabaseClient
                .from("article_likes")
                .insert([{
                    article_id: id,
                    voter_id: userId
                }]);

            if (error) throw error;

            likedArticles.add(Number(id));
            article.likes++;
        }

        openArticle(id);

    } catch (error) {
        console.error("いいね操作失敗:", error);
        alert("いいねの更新に失敗しました。再読み込みしてください。");
        button.disabled = false;
    }
}

// 起動
loadArticles();
