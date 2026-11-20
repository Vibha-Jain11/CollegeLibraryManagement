
/* =========================================
   COLLEGE LIBRARY MANAGEMENT SYSTEM
   Main JavaScript
========================================= */

document.addEventListener("DOMContentLoaded", () => {

    // -------------------------------------
    // 1. LOCAL STORAGE DATABASE
    // -------------------------------------

    const DB = {
        read(key) {
            try {
                const data = JSON.parse(localStorage.getItem(key));
                return Array.isArray(data) ? data : [];
            } catch (error) {
                return [];
            }
        },

        write(key, data) {
            localStorage.setItem(key, JSON.stringify(data));
        },

        books() {
            return this.read("library_books");
        },

        saveBooks(data) {
            this.write("library_books", data);
        },

        members() {
            return this.read("library_members");
        },

        issued() {
            return this.read("library_issued");
        },

        activities() {
            return this.read("library_activities");
        },

        saveActivities(data) {
            this.write("library_activities", data);
        }
    };

    window.LibraryDB = DB;


    // -------------------------------------
    // 2. NAVIGATION
    // -------------------------------------

    const sections = document.querySelectorAll(".page-section");
    const heading = document.getElementById("page-heading");

    const pageNames = {
        dashboard: "Dashboard",
        books: "Book Management",
        members: "Members",
        issue: "Issue Books",
        returns: "Return Books",
        reservations: "Reservations",
        fines: "Fines",
        reports: "Reports",
        settings: "Settings"
    };

    function showPage(pageId) {
        const selectedPage = document.getElementById(pageId);

        if (!selectedPage ||
            !selectedPage.classList.contains("page-section")) {
            return;
        }

        sections.forEach(section => {
            section.classList.toggle("active", section.id === pageId);
        });

        document.querySelectorAll(".nav-link").forEach(button => {
            button.classList.toggle(
                "active",
                button.dataset.page === pageId
            );
        });

        if (heading) {
            heading.textContent = pageNames[pageId] || "Library";
        }

        if (pageId === "dashboard") {
            updateDashboard();
        }

        if (pageId === "books") {
            renderBooks();
        }

        window.scrollTo({ top: 0, behavior: "smooth" });
    }

    // One click handler for sidebar and quick-action buttons.
    document.addEventListener("click", event => {
        const button = event.target.closest("[data-page]");

        if (!button) return;

        event.preventDefault();
        showPage(button.dataset.page);
    });


    // -------------------------------------
    // 3. HELPER FUNCTIONS
    // -------------------------------------

    function escapeHTML(value) {
        return String(value ?? "").replace(/[&<>"']/g, character => {
            const replacements = {
                "&": "&amp;",
                "<": "&lt;",
                ">": "&gt;",
                '"': "&quot;",
                "'": "&#039;"
            };

            return replacements[character];
        });
    }

    function availableCopies(book) {
        if (book.availableCopies !== undefined) {
            return Math.max(0, Number(book.availableCopies) || 0);
        }

        return Math.max(0, Number(book.totalCopies) || 0);
    }

    function totalIssued() {
        return DB.issued().reduce((sum, record) => {
            return sum + Number(record.quantity || 1);
        }, 0);
    }

    function addActivity(member, activity, book, status) {
        const records = DB.activities();

        records.unshift({
            member,
            activity,
            book,
            status,
            date: new Date().toLocaleDateString()
        });

        DB.saveActivities(records.slice(0, 10));
    }


    // -------------------------------------
    // 4. BOOK STATISTICS
    // -------------------------------------

    function updateBookStatistics() {
        const books = DB.books();

        const titles = books.length;

        const copies = books.reduce((sum, book) => {
            return sum + (Number(book.totalCopies) || 0);
        }, 0);

        const available = books.reduce((sum, book) => {
            return sum + availableCopies(book);
        }, 0);

        const titleElement =
            document.getElementById("book-total-titles");

        const copiesElement =
            document.getElementById("book-total-copies");

        const availableElement =
            document.getElementById("book-available-copies");

        if (titleElement) titleElement.textContent = titles;
        if (copiesElement) copiesElement.textContent = copies;
        if (availableElement) availableElement.textContent = available;
    }


    // -------------------------------------
    // 5. DISPLAY BOOKS
    // -------------------------------------

    const booksTable = document.getElementById("books-table");
    const searchInput = document.getElementById("book-search");

    function renderBooks() {
        if (!booksTable) return;

        const books = DB.books();

        const search = searchInput
            ? searchInput.value.trim().toLowerCase()
            : "";

        const filtered = books.filter(book => {
            return (
                String(book.title || "").toLowerCase().includes(search) ||
                String(book.author || "").toLowerCase().includes(search) ||
                String(book.isbn || "").toLowerCase().includes(search)
            );
        });

        if (filtered.length === 0) {
            booksTable.innerHTML = `
                <tr>
                    <td colspan="7">
                        ${books.length === 0
                            ? "No books added yet."
                            : "No matching books found."}
                    </td>
                </tr>
            `;

            updateBookStatistics();
            return;
        }

        booksTable.innerHTML = filtered.map(book => `
            <tr>
                <td><strong>${escapeHTML(book.title)}</strong></td>
                <td>${escapeHTML(book.author)}</td>
                <td>${escapeHTML(book.isbn)}</td>
                <td>${escapeHTML(book.category)}</td>
                <td>${Number(book.totalCopies) || 0}</td>
                <td>
                    <span class="status ${
                        availableCopies(book) > 0 ? "available" : "issued"
                    }">
                        ${availableCopies(book)}
                    </span>
                </td>
                <td>
                    <button type="button"
                        class="table-action edit-button"
                        data-edit="${escapeHTML(book.id)}">
                        Edit
                    </button>
                    <button type="button"
                        class="table-action delete-button"
                        data-delete="${escapeHTML(book.id)}">
                        Delete
                    </button>
                </td>
            </tr>
        `).join("");

        updateBookStatistics();
    }


    // -------------------------------------
    // 6. ADD AND UPDATE BOOKS
    // -------------------------------------

    const bookForm = document.getElementById("book-form");

    const bookEditId = document.getElementById("book-edit-id");
    const bookTitle = document.getElementById("book-title");
    const bookAuthor = document.getElementById("book-author");
    const bookISBN = document.getElementById("book-isbn");
    const bookCategory = document.getElementById("book-category");
    const bookCopies = document.getElementById("book-copies");
    const bookSubmit = document.getElementById("book-submit");
    const bookCancel = document.getElementById("book-cancel");

    function resetBookForm() {
        if (!bookForm) return;

        bookForm.reset();
        bookEditId.value = "";
        bookSubmit.textContent = "Add Book";

        if (bookCancel) bookCancel.hidden = true;

        const formHeading =
            document.getElementById("book-form-heading");

        if (formHeading) formHeading.textContent = "Add New Book";
    }

    if (bookForm) {
        bookForm.addEventListener("submit", event => {
            event.preventDefault();

            const id = bookEditId.value;
            const title = bookTitle.value.trim();
            const author = bookAuthor.value.trim();
            const isbn = bookISBN.value.trim();
            const category = bookCategory.value;
            const copies = Number(bookCopies.value);

            if (!title || !author || !isbn || !category ||
                !Number.isInteger(copies) || copies < 1) {
                alert("Please enter valid details in all fields.");
                return;
            }

            const books = DB.books();

            const duplicate = books.some(book =>
                String(book.isbn).toLowerCase() === isbn.toLowerCase() &&
                String(book.id) !== String(id)
            );

            if (duplicate) {
                alert("A book with this ISBN already exists.");
                return;
            }

            if (id) {
                const index = books.findIndex(book =>
                    String(book.id) === String(id)
                );

                if (index < 0) {
                    alert("Book record not found.");
                    return;
                }

                const oldBook = books[index];

                const issuedCopies =
                    Number(oldBook.totalCopies || 0) -
                    availableCopies(oldBook);

                if (copies < issuedCopies) {
                    alert("Total copies cannot be less than issued copies.");
                    return;
                }

                books[index] = {
                    ...oldBook,
                    title,
                    author,
                    isbn,
                    category,
                    totalCopies: copies,
                    availableCopies: copies - issuedCopies
                };

                addActivity("Administrator", "Book Updated", title, "Updated");
                alert("Book updated successfully!");

            } else {
                books.push({
                    id: "BK" + Date.now(),
                    title,
                    author,
                    isbn,
                    category,
                    totalCopies: copies,
                    availableCopies: copies
                });

                addActivity("Administrator", "Book Added", title, "Added");
                alert("Book added successfully!");
            }

            DB.saveBooks(books);

            resetBookForm();
            renderBooks();
            updateDashboard();
        });
    }


    // -------------------------------------
    // 7. EDIT AND DELETE BOOKS
    // -------------------------------------

    if (booksTable) {
        booksTable.addEventListener("click", event => {

            const editButton = event.target.closest("[data-edit]");
            const deleteButton = event.target.closest("[data-delete]");

            if (editButton) {
                const id = editButton.dataset.edit;

                const book = DB.books().find(item =>
                    String(item.id) === String(id)
                );

                if (!book) return;

                bookEditId.value = book.id;
                bookTitle.value = book.title;
                bookAuthor.value = book.author;
                bookISBN.value = book.isbn;
                bookCategory.value = book.category;
                bookCopies.value = book.totalCopies;

                bookSubmit.textContent = "Update Book";

                if (bookCancel) bookCancel.hidden = false;

                const formHeading =
                    document.getElementById("book-form-heading");

                if (formHeading) formHeading.textContent = "Edit Book";

                bookForm.scrollIntoView({
                    behavior: "smooth",
                    block: "center"
                });
            }

            if (deleteButton) {
                const id = deleteButton.dataset.delete;

                const books = DB.books();

                const book = books.find(item =>
                    String(item.id) === String(id)
                );

                if (!book) return;

                const issuedCopies =
                    Number(book.totalCopies || 0) -
                    availableCopies(book);

                if (issuedCopies > 0) {
                    alert("Return issued copies before deleting this book.");
                    return;
                }

                if (!confirm("Delete this book permanently?")) return;

                DB.saveBooks(books.filter(item =>
                    String(item.id) !== String(id)
                ));

                addActivity("Administrator", "Book Deleted", book.title, "Deleted");

                renderBooks();
                updateDashboard();

                alert("Book deleted successfully!");
            }
        });
    }

    if (bookCancel) {
        bookCancel.addEventListener("click", resetBookForm);
    }

    if (searchInput) {
        searchInput.addEventListener("input", renderBooks);
    }


    // -------------------------------------
    // 8. DASHBOARD
    // -------------------------------------

    function updateDashboard() {
        const books = DB.books();
        const members = DB.members();
        const issued = DB.issued();

        const totalBooks = books.reduce((sum, book) => {
            return sum + (Number(book.totalCopies) || 0);
        }, 0);

        const available = books.reduce((sum, book) => {
            return sum + availableCopies(book);
        }, 0);

        const values = {
            "dash-total-books": totalBooks,
            "dash-available-books": available,
            "dash-issued-books": totalIssued(),
            "dash-members": members.length,
            "dash-overdue": 0,
            "dash-fines": "₹0"
        };

        Object.entries(values).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) element.textContent = value;
        });

        const activityTable =
            document.getElementById("recent-activities");

        if (activityTable) {
            const activities = DB.activities();

            if (activities.length === 0) {
                activityTable.innerHTML = `
                    <tr>
                        <td colspan="4">No activities recorded yet.</td>
                    </tr>
                `;
            } else {
                activityTable.innerHTML = activities.slice(0, 5).map(item => `
                    <tr>
                        <td>${escapeHTML(item.member)}</td>
                        <td>${escapeHTML(item.activity)}</td>
                        <td>${escapeHTML(item.book)}</td>
                        <td>${escapeHTML(item.status)}</td>
                    </tr>
                `).join("");
            }
        }
    }


    // -------------------------------------
    // 9. START APPLICATION
    // -------------------------------------

    renderBooks();
    updateDashboard();
    showPage("dashboard");

});
