// -------------------------------------------------------------------------------------------------------
// Module TX Text Control Comments Extensions
// File: tx-comments.js
//
// This file contains the extensions to include comments to TX Text Control
// -------------------------------------------------------------------------------------------------------

(function () {
    "use strict";

    //-------------------------------------------------------------------------------------------------
    // Global Fields
    //-------------------------------------------------------------------------------------------------
    var _txtViewLoc = { x: 0, y: 0 };
    var _textView;
    var _container;
    var _zoom = 1.0;
    var _activeComment = null;
    var _showComments = true;
    var _removingAction = false;
    var _selectingAction = false;
    var _mainTextActivated = true;

    //-------------------------------------------------------------------------------------------------

    //-------------------------------------------------------------------------------------------------
    // Helpers
    //-------------------------------------------------------------------------------------------------

    // https://gist.github.com/0x263b/2bdd90886c2036a1ad5bcf06d6e6fb37
    // creates a RGB color from a string
    String.prototype.toRGB = function () {
        var hash = 0;
        if (this.length === 0) return hash;
        for (var i = 0; i < this.length; i++) {
            hash = this.charCodeAt(i) + ((hash << 5) - hash);
            hash = hash & hash;
        }
        var rgb = [0, 0, 0];
        for (var i = 0; i < 3; i++) {
            var value = (hash >> (i * 8)) & 255;
            rgb[i] = value;
        }
        return `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`;
    }

    // converts twips (1/20 of a point) to pixel
    function twipsToPixel(twips) {
        return twips * 0.066666666666667;
    }

    //-------------------------------------------------------------------------------------------------

    //-------------------------------------------------------------------------------------------------
    // Event Handling
    //-------------------------------------------------------------------------------------------------

    function window_load() {
        _textView = document.getElementById("mainCanvas");
        _container = document.getElementById("txTemplateDesignerContainer");
    }

    window.addEventListener("load", window_load);

    // attach main event listener to TXTextControl
    TXTextControl.addEventListener("textControlLoaded", textControlLoadedHandler);

    // attach all other required TXTextControl events
    function textControlLoadedHandler(e) {
        TXTextControl.addEventListener("textViewLocationChanged", textViewLocationChangedHandler);
        TXTextControl.addEventListener("zoomFactorChanged", zoomFactorChangedHandler);
        TXTextControl.addEventListener("ribbonTabsLoaded", ribbonTabsLoadedHandler);
        TXTextControl.addEventListener("textControlChanged", textControlChangedHandler);
        TXTextControl.addEventListener("documentLoaded", documentLoadedHandler);
        TXTextControl.addEventListener("contentsReset", contentsResetHandler);
        TXTextControl.addEventListener("inputPositionChanged", inputPositionChangedHandler);
        TXTextControl.addEventListener("headerFooterActivated", headerFooterActivatedHandler);
        TXTextControl.addEventListener("textFrameActivated", headerFooterActivatedHandler);
        TXTextControl.addEventListener("mainTextActivated", mainTextActivatedHandler);
    }

    function ribbonTabsLoadedHandler(e) {

        // load dynamically the ribbon tab and ribbon group from the
        // folder "RibbonExtensions" and add it to the ribbon bar
        $("#ribbonbar ul.tabs").append($('<li>').load('/CommentsExtension/tabComments.html', function () {
            $(this).click(function () {
                $("#ribbonbar li a").removeClass("selected");
                $("#tabComments").addClass("selected");
                $(".tab-content").css("display", "none");
                $("#ribbonTabComments").css("display", "inline-block");
            });
        }));

        // attach functionality to the buttons
        $("#txRibbonTabContentContainer").append($('<div>').load('/CommentsExtension/ribbonTabComments.html?id=1234', function () {
            $("#ribbonTabComments_btnInsertComment").click(function () {
                addComment(); // add a new comment
            });

            $("#ribbonTabComments_btnDeleteComment").click(function () {
                deleteComment(); // remove the active comment
            });

            $("#ribbonTabComments_btnShowComments").click(function () {
                _showComments = !_showComments;
                _activeComment = null;
                refreshComments(); // toggle comments
            });
        }));
    }

    // highlights all comments and updates the ribbon button states
    function refreshComments() {
        if (_removingAction === true) return;

        highlightAllComments();
        updateCommentsRibbon();
    }

    // set states of buttons to reflect the current state
    function updateCommentsRibbon() {
        if (_mainTextActivated === false) {
            $("#ribbonTabComments_btnDeleteComment").addClass("txui-state-disabled");
            $("#ribbonTabComments_btnShowComments").addClass("txui-state-disabled");
            $("#ribbonTabComments_btnInsertComment").addClass("txui-state-disabled");
        }
        else {
            $("#ribbonTabComments_btnDeleteComment").removeClass("txui-state-disabled");
            $("#ribbonTabComments_btnShowComments").removeClass("txui-state-disabled");
            $("#ribbonTabComments_btnInsertComment").removeClass("txui-state-disabled");

            if (_showComments === true)
                $("#ribbonTabComments_btnShowComments").addClass("ribbon-button-selected");
            else
                $("#ribbonTabComments_btnShowComments").removeClass("ribbon-button-selected");

            if (_activeComment != null) {
                $("#ribbonTabComments_btnDeleteComment").removeClass("txui-state-disabled");
            }
            else {
                $("#ribbonTabComments_btnDeleteComment").addClass("txui-state-disabled");
            }
        }
    }

    function headerFooterActivatedHandler(e) {
        _mainTextActivated = false;
        _showComments = false;
        highlightAllComments();
        updateCommentsRibbon();
    }

    function mainTextActivatedHandler(e) {
        _mainTextActivated = true;
        _showComments = true;
        highlightAllComments();
        updateCommentsRibbon();
    }

    // location of the editor changed
    function textViewLocationChangedHandler(e) {

        if (_selectingAction === true) return;

        _txtViewLoc = e.location;

        if (_showComments) {
            _activeComment = null;
            refreshComments();
        }
    }

    // content changed
    function textControlChangedHandler(e) {
        if (_showComments) {
            _activeComment = null;
            refreshComments();
        }
    }

    // input position has been changed
    function inputPositionChangedHandler(e) {
        if (_selectingAction === true) return;

        if (_showComments) {
            _activeComment = null;
            showCommentEditor();
        }
    }

    // new document loaded
    function documentLoadedHandler(e) {
        unhighlightAllComments();

        if (_showComments) {
            refreshComments();
        }
    }

    // new document
    function contentsResetHandler(e) {
        documentLoadedHandler();
    }

    // zoom factor changed
    function zoomFactorChangedHandler(e) {
        _zoom = e.zoomFactor / 100.0;

        if (_showComments) {
            highlightAllComments();
        }
    }

    //-------------------------------------------------------------------------------------------------

    //-------------------------------------------------------------------------------------------------
    // Comment Handling
    //-------------------------------------------------------------------------------------------------

    // this method draws the actual overlay that is displayed on top
    // of the start target
    function drawOverlay(bounds, comment) {

        // reuse, if already created
        var _divOvr = document.getElementById("divOvr_" + comment.id);

        if (_divOvr == null) {
            _divOvr = document.createElement("div"); // create a new DIV
            _divOvr.className = "overlay";
            _divOvr.id = "divOvr_" + comment.id;
            _divOvr.innerHTML = "<div id='title_" + comment.id + "'><strong>" + comment.author + "</strong></div>";
            _divOvr.title = new Date(comment.timestamp).toLocaleString() + ": " + comment.comment;

            _container.appendChild(_divOvr);

            // attach click event to open comment editor
            document.getElementById("title_" + comment.id).addEventListener("click",
                function () { _activeComment = comment.id; showCommentEditor(); });

            // attached hover event to select comment range
            document.getElementById("title_" + comment.id).addEventListener("mouseover",
                function () { _activeComment = comment.id; selectComment(); });
        }

        // retrieve the target location in the document
        var targetPos = bounds.location;

        // and calculate the offset location and zoom factor
        var x = _textView.offsetLeft + (twipsToPixel(targetPos.x) - _txtViewLoc.x) * _zoom;
        var y = _textView.offsetTop + (twipsToPixel(targetPos.y) - _txtViewLoc.y) * _zoom;

        // set position and size including zoom factor
        _divOvr.style.fontSize = (8 * _zoom) + "pt";
        _divOvr.style.zIndex = _textView.style.zIndex + 1;
        _divOvr.style.left = x + "px";
        _divOvr.style.top = y + "px";
        _divOvr.style.marginTop = "-" + 20 * _zoom + "px";
        _divOvr.style.backgroundColor = comment.author.toRGB();

        if (comment.id === _activeComment)
            showCommentEditor();
    }

    function removeAndResetAllOverlays() {
        $(".overlay").removeClass("active");
        $(".overlay").css("marginTop", (-20 * _zoom) + "px");
        $(".commentOverlay").remove();
    }

    // this function shows the comment editor
    // to modify the actual comment
    function showCommentEditor() {

        removeAndResetAllOverlays();
        updateCommentsRibbon();

        if (_activeComment == null) { return; } // no comment active

        TXTextControl.documentTargets.getItem(function (target) {

            target.getName(function (name) {

                var comment = JSON.parse(name);
                var element = document.getElementById("divOvr_" + _activeComment);

                // highlight comment and move down
                element.classList.add("active");
                element.style.marginTop = (20 * _zoom) + "px";

                var _divOvr;

                // create a new html DIV object
                _divOvr = document.createElement("div");
                _divOvr.className = "commentOverlay";
                _divOvr.innerHTML = "<strong>" + new Date(comment.timestamp).toLocaleString() + "</strong><br /><textarea id='commentBox' autofocus>" + comment.comment + "</textarea>";
                _divOvr.style.fontSize = (8 * _zoom) + "pt";

                element.appendChild(_divOvr);

                _divOvr.addEventListener("click", function (evt) {
                    // do not bubble event to Text Control to avoid events
                    evt.preventDefault();
                    evt.stopPropagation();
                    document.getElementById("commentBox").focus();
                });

                document.getElementById("commentBox").focus();

                // save comment when input is changed
                document.getElementById("commentBox").oninput = function () {
                    setCommentValue(target, document.getElementById("commentBox").value)
                };

            });
            
        }, null, "txcs_" + _activeComment);
    }

    // this method stores the new comment value in the name
    // of the target
    function setCommentValue(target, newValue) {
        target.getName(function (name) {
            var commentObject = JSON.parse(name);

            commentObject.comment = newValue;
            commentObject.timestamp = Date.now(),

                target.setName(JSON.stringify(commentObject));
        });
    }

    // this method selects the selection range between the comment
    // targets in the document
    function selectComment() {

        // turn off events temporarily
        _selectingAction = true;

        var selStart;
        var selLength;

        TXTextControl.documentTargets.getItem(function (target) {
            target.getStart(function (startIndex) {
                selStart = startIndex - 1;

                TXTextControl.documentTargets.getItem(function (target) {
                    target.getStart(function (startIndex) {
                        selLength = startIndex - selStart - 1;

                        TXTextControl.select(selStart, selLength, function () {
                            _selectingAction = false;
                        })

                    })
                }, null, "txce_" + _activeComment);

            })
        }, null, "txcs_" + _activeComment);
    }

    // loops through all comments to call the
    // highlightComment method for each single instance
    function highlightAllComments() {
        if (_showComments === true) {
            TXTextControl.documentTargets.forEach(function (startTarget) {
                startTarget.getTargetName(function (name) {
                    if (name.startsWith("txcs_")) {
                        TXTextControl.documentTargets.getItem(function (endTarget) {
                            highlightComment(startTarget, endTarget);
                        }, null, "txce_" + name.substring(5));
                    }
                });
            });
        }
        else {
            $(".overlay").remove();
        }
    }

    // removes all overlays
    function unhighlightAllComments() {
        _activeComment = null;
        $(".overlay").remove();
    }

    // this methods retrieves the start and end characters of the targets
    // to call the drawOverlay method with the specific bounds
    function highlightComment(startTarget, endTarget) {

        startTarget.getName(function (name) {

            var commentObject = JSON.parse(name);

            startTarget.getStart(function (index) {
                TXTextControl.textChars.elementAt(index - 1, function (tcStart) {
                    tcStart.getBounds(function (startBounds) {

                        endTarget.getStart(function (index) {
                            TXTextControl.textChars.elementAt(index, function (tcEnd) {
                                tcEnd.getBounds(function (endBounds) {

                                    var commentRect = {
                                        location: { x: startBounds.location.x, y: startBounds.location.y },
                                        size: {
                                            width: endBounds.location.x - startBounds.location.x,
                                            height: endBounds.location.y - startBounds.location.y
                                        }
                                    }

                                    drawOverlay(commentRect, commentObject);
                                })
                            })
                        });

                    })
                })
            });
        });
    }

    // returns an array of user names from Text Control
    function getUserNames() {
        return new Promise(resolve => {
            TXTextControl.getUserNames(function (userNames) {
                if (userNames.length === 0) {
                    resolve("Unknown user");
                }
                else {
                    resolve(userNames[0]);
                }
            });
        });
    }

    // retrieves the current selection
    function getSelectionRange() {
        return new Promise(resolve => {
            TXTextControl.selection.getStart(function (curSelStart) {
                TXTextControl.selection.getLength(function (curSelLength) {

                    var range = {
                        start: curSelStart,
                        end: curSelStart + curSelLength,
                    };

                    resolve(range);
                });
            });
        });
    }

    // this methods inserts the actual targets for comments
    // into Text Control. The object that is stored in the name
    // property of type comment has the following values:
    //
    // comment: string
    // author: string
    // timestamp: date
    // id: string
    async function addComment() {

        var id = Math.random().toString(36).substring(2); // random id

        var userName = await getUserNames();

        // create comment object
        var comment = {
            comment: "",
            author: userName,
            timestamp: Date.now(),
            id: id,
        };

        var range = await getSelectionRange();
        TXTextControl.select(range.start, 0);

        // insert start target
        TXTextControl.documentTargets.add("txcs_" + id, dt => {
            dt.setName(JSON.stringify(comment));
            dt.setDeleteable(false);

            TXTextControl.select(range.end, 0);

            // insert end target
            TXTextControl.documentTargets.add("txce_" + id, endTarget => {

                _activeComment = id;
                refreshComments();
            });
        });
    }

    // deletes the targets of the currently
    // active comment(_activeComment)
    function deleteComment() {

        _removingAction = true;

        TXTextControl.documentTargets.getItem(function (target) {
            TXTextControl.documentTargets.remove(target);

            TXTextControl.documentTargets.getItem(function (target) {
                TXTextControl.documentTargets.remove(target);

                _activeComment = null;
                _removingAction = false;
                unhighlightAllComments();
                refreshComments();

            }, null, "txce_" + _activeComment);

        }, null, "txcs_" + _activeComment);
    }
})();