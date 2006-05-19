var ScholarLocalizedStrings;
var myTreeView;
var dynamicBox;
var itemBeingEdited; 			//the item currently being edited

Scholar.TreeView = function()
{
	this._treebox = null;
	this._dataItems = new Array();
	this.rowCount = 0;
}

Scholar.TreeView.prototype.setTree = function(treebox)
{
	if(this._treebox)
		return;
	this._treebox = treebox;
	
	var newRows = Scholar.Items.getTreeRows();
	for(var i = 0; i < newRows.length; i++)
		this._showItem(newRows[i],  0, i+1); //item ref, isContainerOpen, level
	
	this.rowCount = this._dataItems.length;
}

Scholar.TreeView.prototype.getCellText = function(row, column)
{
	var obj = this._getItemAtRow(row);
	
	if(obj.isFolder())
	{
		if(column.id == "title_column")
			return obj.getName();
		else
			return "";
	}
	else
	{
		if(column.id == "title_column")
			return obj.getField("title");
		else if(column.id == "creator_column")
			return obj.getField("firstCreator");
		else
			return obj.getField("source");
	}
}

Scholar.TreeView.prototype.isContainer = function(row) 		{ return this._getItemAtRow(row).isFolder(); }
Scholar.TreeView.prototype.isContainerOpen = function(row)  { return this._dataItems[row][1]; }
Scholar.TreeView.prototype.isContainerEmpty = function(row) { return (this.isContainer(row) && this._getItemAtRow(row).isEmpty()); }
Scholar.TreeView.prototype.getLevel = function(row) 		{ return this._dataItems[row][2]; }

Scholar.TreeView.prototype.getParentIndex = function(row)
{
	var thisLevel = this.getLevel(row);
	if(thisLevel == 0) return -1;
	for(var i = row - 1; i >= 0; i--)
		if(this.getLevel(i) < thisLevel)
			return i;
	return -1;
}

Scholar.TreeView.prototype.hasNextSibling = function(row, afterIndex)
{
	var thisLevel = this.getLevel(row);
	for(var i = afterIndex + 1; i < this.rowCount; i++)
	{	
		var nextLevel = this.getLevel(i);
		if(nextLevel == thisLevel) return true;
		else if(nextLevel < thisLevel) return false;
	}
}

Scholar.TreeView.prototype.toggleOpenState = function(row)
{
	var count = 0;		//used to tell the tree how many rows were added/removed
	var thisLevel = this.getLevel(row);

	if(this.isContainerOpen(row))
	{
		while((row + 1 < this._dataItems.length) && (this.getLevel(row + 1) > thisLevel))
		{
			this._hideItem(row+1);
			count--;	//count is negative when closing a container because we are removing rows
		}
	}
	else
	{
		var newRows = Scholar.Items.getTreeRows(this._getItemAtRow(row).getID()); //Get children
		
		for(var i = 0; i < newRows.length; i++)
		{
			count++;
			this._showItem(newRows[i], thisLevel+1, row+i+1); //insert new row
		}
	}
	
	this._dataItems[row][1] = !this._dataItems[row][1];  //toggle container open value

	this.rowCount = this._dataItems.length;
	this._treebox.rowCountChanged(row+1, count); //tell treebox to repaint these
	this._treebox.invalidateRow(row);
}

Scholar.TreeView.prototype.selectionChanged = function()
{
	if(this.selection.count == 1 && !this.isContainer(this.selection.currentIndex))
	{
		viewSelectedItem();
		document.getElementById('tb-edit').hidden = false;
	}
	else
	{
		removeDynamicRows();
		document.getElementById('tb-edit').hidden = true;
	}
}


Scholar.TreeView.prototype._showItem = function(item, level, beforeRow) 	{ this._dataItems.splice(beforeRow, 0, [item, false, level]); }

Scholar.TreeView.prototype._hideItem = function(row) 						{ this._dataItems.splice(row,1); }

Scholar.TreeView.prototype._getItemAtRow = function(row)					{ return this._dataItems[row][0]; }
Scholar.TreeView.prototype.isSorted = function() 							{ return false; }
Scholar.TreeView.prototype.isSeparator = function(row) 						{ return false; }
Scholar.TreeView.prototype.isEditable = function(row, idx) 					{ return false; }
Scholar.TreeView.prototype.getRowProperties = function(row, prop) 			{ }
Scholar.TreeView.prototype.getColumnProperties = function(col, prop) 		{ }
Scholar.TreeView.prototype.getCellProperties = function(row, col, prop) 	{ }
Scholar.TreeView.prototype.getImageSrc = function(row, col) 				{ }
Scholar.TreeView.prototype.performAction = function(action) 				{ }
Scholar.TreeView.prototype.performActionOnCell = function(action, row, col)	{ }
Scholar.TreeView.prototype.getProgressMode = function(row, col) 			{ }

Scholar.TreeView.prototype.deleteSelectedItem = function()
{
	if(this.selection.count == 0)
	{
		return;
	}
	else if(confirm("Are you sure you want to delete the selected item"+(this.selection.count > 1 ? "s" : "")))
	{
		//PS - ask first!!
		var items = new Array();
		var start = new Object();
		var end = new Object();
		
		for (var i=0, len=this.selection.getRangeCount(); i<len; i++)
		{
			this.selection.getRangeAt(i,start,end);
			for (var j=start.value; j<=end.value; j++)
			{
				if(!this.isContainer(j))
				{
					items.push(j);
					//this._getItemAtRow(j).erase();
				}
			}
		}
		
		for (var i=0; i<items.length; i++)
		{
			this._hideItem(items[i]-i);
			this.rowCount--;
			
			this._treebox.rowCountChanged(items[i]-i, -1);
		}
	}
}
/*
DRAG AND DROP (IMPLEMENT LATER)
Scholar.DragObserver.canDrop = function(row, orient)					{ return !orient; }
Scholar.DragObserver.drop = function(row, orient)						{ }
*/

function viewSelectedItem()
{
	removeDynamicRows();

	var thisItem = myTreeView._getItemAtRow(myTreeView.selection.currentIndex);

	var fieldNames = getFullFieldList(thisItem);

	for(var i = 0; i<fieldNames.length; i++)
	{
		if(thisItem.getField(fieldNames[i]) != "")
		{
			var label = document.createElement("label");
			label.setAttribute("value",ScholarLocalizedStrings.getString("itemFields."+fieldNames[i])+":");
			
			var valueElement = document.createElement("description");
			valueElement.appendChild(document.createTextNode(thisItem.getField(fieldNames[i])));
			
			var row = document.createElement("row");
			row.appendChild(label);
			row.appendChild(valueElement);
			row.setAttribute("id","dynamic-"+fieldNames[i]);
			
			dynamicBox.appendChild(row);
		}
	}
	
	var beforeField = dynamicBox.firstChild.nextSibling;
	
	for (var i=0,len=thisItem.numCreators(); i<len; i++)
	{
		var creator = thisItem.getCreator(i);
		
		var label = document.createElement("label");
		label.setAttribute("value","Creator:");
		
		var valueElement = document.createElement("description");
		valueElement.appendChild(document.createTextNode(creator.lastName+", "+creator.firstName));
		
		var row = document.createElement("row");
		row.appendChild(label);
		row.appendChild(valueElement);

		dynamicBox.insertBefore(row, beforeField);
	}

}

function newItem(typeID)
{
	editItem(Scholar.Items.getNewItemByType(typeID));
}

function editSelectedItem()
{
	editItem(myTreeView._getItemAtRow(myTreeView.selection.currentIndex));
}

function editItem(thisItem)
{
	document.getElementById('list-pane').hidden = true;
	document.getElementById('edit-pane').hidden = false;
	
	removeDynamicRows();
	var fieldNames = getFullFieldList(thisItem);

	for(var i = 0; i<fieldNames.length; i++)
	{
		if(!thisItem.isPrimaryField(fieldNames[i]) || thisItem.isEditableField(fieldNames[i]))
		{
			var label = document.createElement("label");
			label.setAttribute("value",ScholarLocalizedStrings.getString("itemFields."+fieldNames[i])+":");
			label.setAttribute("control","dynamic-field-"+i);
			
			//create the textbox
			var valueElement = document.createElement("textbox");
			valueElement.setAttribute("value",thisItem.getField(fieldNames[i]));
			valueElement.setAttribute("id","dynamic-field-"+i);		//just so the label can be assigned to this valueElement
			valueElement.setAttribute("fieldName",fieldNames[i]);	//we will use this later
			
			var row = document.createElement("row");
			row.appendChild(label);
			row.appendChild(valueElement);
			dynamicBox.appendChild(row);
		}
	}

/* DISABLE EDITING OF CREATORS UNTIL WE COME UP WITH A GOOD METHOD		
	var beforeField = dynamicBox.firstChild.nextSibling;

	for (var i=0,len=thisItem.numCreators(); i<len; i++)
	{
		var creator = thisItem.getCreator(i);
		
		var label = document.createElement("label");
		label.setAttribute("value","Creator:");
		label.setAttribute("control","dynamic-creator-"+i);

		var valueElement = document.createElement("textbox");
		valueElement.setAttribute("value",creator.lastName+", "+creator.firstName);
		valueElement.setAttribute("id","dynamic-field-"+i);
		
		var row = document.createElement("row");
		row.appendChild(label);
		row.appendChild(valueElement);
		
		dynamicBox.insertBefore(row, beforeField);
	}
*/
	itemBeingEdited = thisItem;
}

function removeDynamicRows()
{
	while(dynamicBox.hasChildNodes())
		dynamicBox.removeChild(dynamicBox.firstChild);
}

function getFullFieldList(item)
{
	var fields = Scholar.ItemFields.getItemTypeFields(item.getField("itemTypeID"));
	var fieldNames = new Array("title","dateAdded","dateModified","source","rights");
	for(var i = 0; i<fields.length; i++)
		fieldNames.push(Scholar.ItemFields.getName(fields[i]));
	return fieldNames;
}

function returnToTree(save)
{
	if(save)
	{
		//get fields, call data access methods
		var valueElements = dynamicBox.getElementsByTagName("textbox");		//All elements of tagname 'textbox' should be the values of edits
		for(var i=0; i<valueElements.length; i++)
			itemBeingEdited.setField(valueElements[i].getAttribute("fieldName"),valueElements[i].value);
	
		itemBeingEdited.save();
	}
	itemBeingEdited = null;

	document.getElementById('list-pane').hidden = false;
	document.getElementById('edit-pane').hidden = true;

	viewSelectedItem();
}

function init()
{
	myTreeView = new Scholar.TreeView();
	ScholarLocalizedStrings = document.getElementById('scholar-strings');
	dynamicBox = document.getElementById('dynamic-fields');
	
	var addMenu = document.getElementById('tb-add').firstChild;
	var itemTypes = Scholar.ItemTypes.getTypes();
	for(var i = 0; i<itemTypes.length; i++)
	{
		var menuitem = document.createElement("menuitem");
		menuitem.setAttribute("label",ScholarLocalizedStrings.getString("itemTypes."+itemTypes[i]['name']));
		menuitem.setAttribute("oncommand","newItem("+itemTypes[i]['id']+")");
		addMenu.appendChild(menuitem);
	}

    document.getElementById('list-tree').view=myTreeView;
}

Scholar.testString = 'Sidebar is registered.';