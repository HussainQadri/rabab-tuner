Welcome to my development log, this is where I will post weekly updates about building my Rubab tuner project.

## Blog

{% for post in site.posts %}
- **{{ post.date | date: "%d %b %Y" }}** —
  [{{ post.title }}]({{ post.url | relative_url }})
{% endfor %}
