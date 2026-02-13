# GitHub

提供常见的github仓库接口，包含查询仓库信息、人员信息

## 获取用户所有仓库

输入所有用户ID，返回用户所有仓库信息。

### 接口地址

`POST /api/saas/tool/v1/plugin/run/38829`

**Fetch 请求配置：**
```javascript
{
  method: "POST",
  url: "https://joycode-api.jd.com/api/saas/tool/v1/plugin/run/38829",
  headers: {
    "Content-Type": "application/json",
    "Authorization": "jEUDolnv5LXxwOPs2YOyzEiNnTZwVGO2BllOaZOhi8M="
  },
  body: {
    params: {
      userId: "" // String, 必填, GitHub用户名
    }
  }
}
```

**Fetch 响应格式：**
```javascript
{
  code: 200, // number, 响应状态码
  msg: "", // string, 响应消息
  data: {
    $$result: "" // String, 全部输出
  }
}
```

## 获取某个仓库的详细信息

根据用户ID和仓库名称，获取仓库具体信息。

### 接口地址

`POST /api/saas/tool/v1/plugin/run/38830`

**Fetch 请求配置：**
```javascript
{
  method: "POST",
  url: "https://joycode-api.jd.com/api/saas/tool/v1/plugin/run/38830",
  headers: {
    "Content-Type": "application/json",
    "Authorization": "jEUDolnv5LXxwOPs2YOyzEiNnTZwVGO2BllOaZOhi8M="
  },
  body: {
    params: {
      userId: "", // String, 必填, GitHub用户名
      repoName: "" // String, 必填, 仓库名称
    }
  }
}
```

**Fetch 响应格式：**
```javascript
{
  code: 200, // number, 响应状态码
  msg: "", // string, 响应消息
  data: {
    allow_forking: false, // Boolean, 
    stargazers_count: 0, // Integer, 
    is_template: false, // Boolean, 
    pushed_at: "", // String, 
    subscription_url: "", // String, 
    language: "", // String, 
    branches_url: "", // String, 
    issue_comment_url: "", // String, 
    labels_url: "", // String, 
    subscribers_url: "", // String, 
    temp_clone_token: "", // String, 
    releases_url: "", // String, 
    svn_url: "", // String, 
    subscribers_count: 0, // Integer, 
    id: 0, // Integer, 
    has_discussions: false, // Boolean, 
    forks: 0, // Integer, 
    archive_url: "", // String, 
    git_refs_url: "", // String, 
    forks_url: "", // String, 
    visibility: "", // String, 
    statuses_url: "", // String, 
    network_count: 0, // Integer, 
    ssh_url: "", // String, 
    license: "", // String, 
    full_name: "", // String, 
    size: 0, // Integer, 
    languages_url: "", // String, 
    html_url: "", // String, 
    collaborators_url: "", // String, 
    clone_url: "", // String, 
    name: "", // String, 
    pulls_url: "", // String, 
    default_branch: "", // String, 
    hooks_url: "", // String, 
    trees_url: "", // String, 
    tags_url: "", // String, 
    private: false, // Boolean, 
    contributors_url: "", // String, 
    has_downloads: false, // Boolean, 
    notifications_url: "", // String, 
    open_issues_count: 0, // Integer, 
    description: "", // String, 
    created_at: "", // String, 
    watchers: 0, // Integer, 
    keys_url: "", // String, 
    deployments_url: "", // String, 
    has_projects: false, // Boolean, 
    archived: false, // Boolean, 
    has_wiki: false, // Boolean, 
    updated_at: "", // String, 
    comments_url: "", // String, 
    stargazers_url: "", // String, 
    disabled: false, // Boolean, 
    git_url: "", // String, 
    has_pages: false, // Boolean, 
    owner: { // Object, 
      gists_url: "", // String, 
      repos_url: "", // String, 
      user_view_type: "", // String, 
      following_url: "", // String, 
      starred_url: "", // String, 
      login: "", // String, 
      followers_url: "", // String, 
      type: "", // String, 
      url: "", // String, 
      subscriptions_url: "", // String, 
      received_events_url: "", // String, 
      avatar_url: "", // String, 
      events_url: "", // String, 
      html_url: "", // String, 
      site_admin: false, // Boolean, 
      id: 0, // Integer, 
      gravatar_id: "", // String, 
      node_id: "", // String, 
      organizations_url: "" // String, 
    },
    commits_url: "", // String, 
    compare_url: "", // String, 
    git_commits_url: "", // String, 
    topics: [ // Array, 
    ],
    blobs_url: "", // String, 
    git_tags_url: "", // String, 
    merges_url: "", // String, 
    downloads_url: "", // String, 
    has_issues: false, // Boolean, 
    web_commit_signoff_required: false, // Boolean, 
    url: "", // String, 
    contents_url: "", // String, 
    mirror_url: "", // String, 
    milestones_url: "", // String, 
    teams_url: "", // String, 
    fork: false, // Boolean, 
    issues_url: "", // String, 
    events_url: "", // String, 
    issue_events_url: "", // String, 
    assignees_url: "", // String, 
    open_issues: 0, // Integer, 
    watchers_count: 0, // Integer, 
    node_id: "", // String, 
    homepage: "", // String, 
    forks_count: 0 // Integer, 
  }
}
```

