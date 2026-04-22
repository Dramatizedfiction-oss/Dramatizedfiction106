export default function NewBookPage() {
  return (
    <div className="max-w-2xl mx-auto py-10">
      <h1 className="theme-heading text-3xl font-bold mb-6">Create a New Book</h1>

      <form action="/author/books/new" method="post" className="space-y-4">
        <div>
          <label className="theme-heading block font-medium mb-1">Title</label>
          <input
            type="text"
            name="title"
            className="w-full rounded border border-[var(--border-color)] bg-[var(--bg-secondary)] px-3 py-2 text-[var(--text-primary)]"
            required
          />
        </div>

        <div>
          <label className="theme-heading block font-medium mb-1">Description</label>
          <textarea
            name="description"
            className="w-full rounded border border-[var(--border-color)] bg-[var(--bg-secondary)] px-3 py-2 text-[var(--text-primary)]"
            rows={4}
            required
          />
        </div>

        <button
          type="submit"
          className="story-button-primary"
        >
          Create Book
        </button>
      </form>
    </div>
  );
}
